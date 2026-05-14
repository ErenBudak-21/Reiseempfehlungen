require('dotenv').config()
const express = require('express')
const cors = require('cors')
const neo4j = require('neo4j-driver')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
)

// Hilfsfunktion: Neo4j Werte in JavaScript-kompatible Werte umwandeln
function cleanValue(val) {
  if (val === null || val === undefined) return val
  if (neo4j.isInt(val)) return val.toNumber()
  if (neo4j.isDate(val) || neo4j.isDateTime(val)) return val.toString()
  if (Array.isArray(val)) return val.map(cleanValue)
  if (typeof val === 'object' && val.properties) {
    const obj = {}
    for (const k in val.properties) obj[k] = cleanValue(val.properties[k])
    return obj
  }
  if (typeof val === 'object') {
    const obj = {}
    for (const k in val) obj[k] = cleanValue(val[k])
    return obj
  }
  return val
}

function cleanRecords(result) {
  return result.records.map(record => {
    const obj = {}
    record.keys.forEach(key => { obj[key] = cleanValue(record.get(key)) })
    return obj
  })
}

// Wrapper: führt Query aus, gibt Query + Ergebnis zurück
async function runQuery(query, params = {}) {
  const session = driver.session()
  try {
    const result = await session.run(query, params)
    return { query: query.trim(), params, data: cleanRecords(result) }
  } finally {
    await session.close()
  }
}

// =============================================================
// USERS - CRUD
// =============================================================

// Alle User lesen
app.get('/api/users', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (u:User)
      OPTIONAL MATCH (u)-[:PREFERS]->(c:Category)
      RETURN u.id AS id, u.name AS name, u.email AS email,
             c.name AS präferenz
      ORDER BY toInteger(substring(u.id, 1)) ASC
    `)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// User erstellen (mit Kategorie-Präferenz als Verknüpfung!)
app.post('/api/users', async (req, res) => {
  const { name, email, praeferenz } = req.body
  try {
    const result = await runQuery(`
      OPTIONAL MATCH (existing:User)
      WITH coalesce(max(toInteger(substring(existing.id, 1))), 0) + 1 AS nextNum
      CREATE (u:User {
        id: CASE WHEN nextNum < 10 THEN 'U0' + toString(nextNum) ELSE 'U' + toString(nextNum) END,
        name: $name, email: $email
      })
      WITH u
      OPTIONAL MATCH (c:Category {name: $praeferenz})
      FOREACH (cat IN CASE WHEN c IS NOT NULL THEN [c] ELSE [] END |
        CREATE (u)-[:PREFERS]->(cat)
      )
      RETURN u.id AS id, u.name AS name
    `, { name, email, praeferenz })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// User ändern (inkl. Präferenz-Verknüpfung)
app.put('/api/users/:id', async (req, res) => {
  const { name, email, praeferenz } = req.body
  try {
    const result = await runQuery(`
      MATCH (u:User {id: $id})
      SET u.name = $name, u.email = $email
      WITH u
      OPTIONAL MATCH (u)-[r:PREFERS]->()
      DELETE r
      WITH u
      OPTIONAL MATCH (c:Category {name: $praeferenz})
      FOREACH (cat IN CASE WHEN c IS NOT NULL THEN [c] ELSE [] END |
        CREATE (u)-[:PREFERS]->(cat)
      )
      RETURN u.id AS id, u.name AS name
    `, { id: req.params.id, name, email, praeferenz: praeferenz || '' })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// User löschen (DETACH wegen Beziehungen)
app.delete('/api/users/:id', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (u:User {id: $id})
      OPTIONAL MATCH (u)-[:MADE]->(b:Booking)
      DETACH DELETE u, b
    `, { id: req.params.id })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// PROPERTIES - Lesen mit Filtern
// =============================================================

app.get('/api/properties', async (req, res) => {
  const { category, city, minRating } = req.query
  const params = {}

  // Stadt- und Rating-Filter direkt im MATCH (gebundene Variablen → sicheres Filtern)
  const mainConds = []
  if (city)      { mainConds.push('city.name = $city');       params.city      = city }
  if (minRating) { mainConds.push('p.rating >= $minRating'); params.minRating = parseFloat(minRating) }
  const mainWhere = mainConds.length ? 'WHERE ' + mainConds.join(' AND ') : ''

  // Kategorie: MATCH (= strict, nur passende) vs. OPTIONAL MATCH (alle inkl. ohne Kategorie)
  let catClause
  if (category) {
    catClause = 'MATCH (p)-[:OF_CATEGORY]->(cat:Category) WHERE cat.name = $category'
    params.category = category
  } else {
    catClause = 'OPTIONAL MATCH (p)-[:OF_CATEGORY]->(cat:Category)'
  }

  const query = `
    MATCH (p:Property)-[:LOCATED_IN]->(city:City)
    ${mainWhere}
    OPTIONAL MATCH (city)-[:IN_COUNTRY]->(country:Country)
    WITH p, city, collect(country)[0] AS country
    ${catClause}
    RETURN p.id AS id, p.name AS name, p.type AS type,
           p.pricePerNight AS preis, p.rating AS rating,
           city.name AS stadt, country.name AS land, cat.name AS kategorie
    ORDER BY toInteger(substring(p.id, 1)) ASC
  `
  try {
    const result = await runQuery(query, params)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// BOOKINGS - VERKNÜPFUNGEN erfassen und löschen (Kernaufgabe!)
// =============================================================

app.get('/api/bookings', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (u:User)-[:MADE]->(b:Booking)-[:FOR]->(p:Property)
      RETURN b.id AS id, u.name AS user, p.name AS property,
             b.checkIn AS checkIn, b.checkOut AS checkOut,
             b.price AS preis
      ORDER BY toInteger(substring(b.id, 1)) ASC
    `)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Buchung anlegen = Verknüpfung zwischen User und Property erfassen!
app.post('/api/bookings', async (req, res) => {
  const { userId, propertyId, checkIn, checkOut, price } = req.body
  try {
    const result = await runQuery(`
      OPTIONAL MATCH (existing:Booking)
      WITH coalesce(max(toInteger(substring(existing.id, 1))), 0) + 1 AS nextNum
      MATCH (u:User {id: $userId})
      MATCH (p:Property {id: $propertyId})
      CREATE (u)-[:MADE]->(b:Booking {
        id: CASE WHEN nextNum < 10 THEN 'B0' + toString(nextNum) ELSE 'B' + toString(nextNum) END,
        checkIn: date($checkIn),
        checkOut: date($checkOut),
        price: toFloat($price)
      })-[:FOR]->(p)
      RETURN b.id AS id, u.name AS user, p.name AS property
    `, { userId, propertyId, checkIn, checkOut, price })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Buchung löschen
app.delete('/api/bookings/:id', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (b:Booking {id: $id})
      DETACH DELETE b
    `, { id: req.params.id })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// PFADNUTZUNG - 2-Hop (User → Booking → Property)
// =============================================================
app.get('/api/path/bookings-by-user/:userId', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (u:User {id: $userId})-[:MADE]->(b:Booking)-[:FOR]->(p:Property)
      RETURN u.name AS user, b.id AS buchung,
             p.name AS property, b.price AS preis, b.checkIn AS datum
      ORDER BY b.checkIn DESC
    `, { userId: req.params.userId })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// PFADNUTZUNG - 4er-Kette (User → Booking → Property → City → Country)
// =============================================================
app.get('/api/path/full-journey/:userId', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (u:User {id: $userId})-[:MADE]->(b:Booking)-[:FOR]->(p:Property)
            -[:LOCATED_IN]->(city:City)-[:IN_COUNTRY]->(country:Country)
      RETURN u.name AS user, b.checkIn AS datum,
             p.name AS property, city.name AS stadt, country.name AS land
      ORDER BY b.checkIn
    `, { userId: req.params.userId })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// AGGREGATION mit Filter - Kennzahl pro zentralem Objekt (Property)
// =============================================================

// Durchschnittspreis und Buchungsanzahl pro Stadt (nur rating >= 4)
app.get('/api/stats/avg-price-by-city', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (b:Booking)-[:FOR]->(p:Property)-[:LOCATED_IN]->(city:City)
      WHERE p.rating >= 4
      RETURN city.name AS stadt,
             count(b) AS anzahl_buchungen,
             round(avg(b.price) * 100) / 100 AS durchschnittspreis,
             round(avg(p.rating) * 10) / 10 AS avg_rating
      ORDER BY anzahl_buchungen DESC
    `)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Beliebteste Kategorien - Buchungen + Umsatz
app.get('/api/stats/bookings-by-category', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (b:Booking)-[:FOR]->(p:Property)-[:OF_CATEGORY]->(cat:Category)
      WHERE b.price > 0
      RETURN cat.name AS kategorie,
             count(b) AS anzahl_buchungen,
             sum(b.price) AS gesamtumsatz
      ORDER BY anzahl_buchungen DESC
    `)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// EMPFEHLUNG - Collaborative Filtering + Preference Boost
// =============================================================
app.get('/api/recommendations/:userId', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (ich:User {id: $userId})-[:MADE]->(:Booking)-[:FOR]->(gemeinsam:Property)
            <-[:FOR]-(:Booking)<-[:MADE]-(andere:User)
      WHERE andere <> ich
      MATCH (andere)-[:MADE]->(:Booking)-[:FOR]->(empfehlung:Property)
            -[:OF_CATEGORY]->(cat:Category)
      WHERE NOT (ich)-[:MADE]->(:Booking)-[:FOR]->(empfehlung)
      WITH ich, empfehlung, cat,
           count(DISTINCT andere) AS aehnliche_nutzer,
           collect(DISTINCT andere.name) AS basierend_auf
      OPTIONAL MATCH (ich)-[pref:PREFERS]->(cat)
      WITH empfehlung, cat, aehnliche_nutzer, basierend_auf,
           CASE WHEN pref IS NOT NULL THEN 3 ELSE 1 END AS kategorie_boost
      RETURN empfehlung.name AS property,
             empfehlung.type AS typ,
             cat.name AS kategorie,
             empfehlung.rating AS rating,
             aehnliche_nutzer * kategorie_boost AS score,
             basierend_auf
      ORDER BY score DESC, empfehlung.rating DESC
      LIMIT 5
    `, { userId: req.params.userId })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// DASHBOARD - Übersichtszahlen
// =============================================================
app.get('/api/dashboard', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (u:User) WITH count(u) AS users
      MATCH (p:Property) WITH users, count(p) AS properties
      MATCH (b:Booking) WITH users, properties, count(b) AS bookings,
                             round(avg(b.price) * 100) / 100 AS avg_preis
      RETURN users, properties, bookings, avg_preis
    `)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// PROPERTIES - CRUD (Erfassen, Ändern, Löschen)
// =============================================================

// Property erstellen (mit City-, Country- und Category-Verknüpfung)
app.post('/api/properties', async (req, res) => {
  const { name, type, pricePerNight, rating, cityName, countryName, categoryName } = req.body
  try {
    const result = await runQuery(`
      OPTIONAL MATCH (existing:Property)
      WITH coalesce(max(toInteger(substring(existing.id, 1))), 0) + 1 AS nextNum
      MERGE (city:City {name: $cityName})
      FOREACH (ignored IN CASE WHEN $countryName <> '' THEN [1] ELSE [] END |
        MERGE (country:Country {name: $countryName})
        MERGE (city)-[:IN_COUNTRY]->(country)
      )
      CREATE (p:Property {
        id: CASE WHEN nextNum < 10 THEN 'P0' + toString(nextNum) ELSE 'P' + toString(nextNum) END,
        name: $name, type: $type,
        pricePerNight: toFloat($pricePerNight),
        rating: toInteger($rating)
      })-[:LOCATED_IN]->(city)
      WITH p
      OPTIONAL MATCH (cat:Category {name: $categoryName})
      FOREACH (c IN CASE WHEN cat IS NOT NULL THEN [cat] ELSE [] END |
        CREATE (p)-[:OF_CATEGORY]->(c)
      )
      RETURN p.id AS id, p.name AS name
    `, { name, type, pricePerNight, rating, cityName, countryName: countryName || '', categoryName })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Property ändern (inkl. Stadt- und Land-Verknüpfung)
app.put('/api/properties/:id', async (req, res) => {
  const { name, type, pricePerNight, rating, cityName, countryName } = req.body
  try {
    const result = await runQuery(`
      MATCH (p:Property {id: $id})
      SET p.name = $name, p.type = $type,
          p.pricePerNight = toFloat($pricePerNight),
          p.rating = toInteger($rating)
      WITH p
      OPTIONAL MATCH (p)-[r:LOCATED_IN]->()
      DELETE r
      WITH p
      MERGE (city:City {name: $cityName})
      WITH p, city
      OPTIONAL MATCH (city)-[oldRel:IN_COUNTRY]->()
      DELETE oldRel
      WITH p, city
      FOREACH (ignored IN CASE WHEN $countryName <> '' THEN [1] ELSE [] END |
        MERGE (country:Country {name: $countryName})
        MERGE (city)-[:IN_COUNTRY]->(country)
      )
      CREATE (p)-[:LOCATED_IN]->(city)
      RETURN p.id AS id, p.name AS name
    `, { id: req.params.id, name, type, pricePerNight, rating, cityName, countryName: countryName || '' })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Property löschen (DETACH wegen Buchungs-Beziehungen)
app.delete('/api/properties/:id', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (p:Property {id: $id})
      DETACH DELETE p
    `, { id: req.params.id })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// HILFSENDPUNKTE - für Dropdowns im Frontend
// =============================================================
app.get('/api/categories', async (req, res) => {
  try {
    const result = await runQuery(`MATCH (c:Category) RETURN c.name AS name ORDER BY c.name`)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/cities', async (req, res) => {
  try {
    const result = await runQuery(`MATCH (c:City) RETURN c.name AS name ORDER BY c.name`)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/countries', async (req, res) => {
  try {
    const result = await runQuery(`MATCH (c:Country) RETURN c.name AS name ORDER BY c.name`)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})


// Verwaiste Booking-Nodes löschen (kein User oder kein Property verknüpft)
app.delete('/api/admin/orphan-bookings', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (b:Booking)
      WHERE NOT (:User)-[:MADE]->(b) OR NOT (b)-[:FOR]->(:Property)
      DETACH DELETE b
      RETURN count(*) AS deleted
    `)
    res.json({ ok: true, data: result.data })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Einmaliger Fix: Oesterreich / Öesterreich → Österreich umbenennen + Duplikate bereinigen
app.post('/api/admin/fix-austria', async (req, res) => {
  try {
    await runQuery(`
      MATCH (c:Country) WHERE c.name IN ['Oesterreich', 'Öesterreich', 'Oesterreich ']
      SET c.name = 'Österreich'
    `)
    await runQuery(`
      MATCH (city:City)-[r:IN_COUNTRY]->(c:Country {name: 'Österreich'})
      WITH city, collect(r) AS rels
      WHERE size(rels) > 1
      UNWIND tail(rels) AS dupRel
      DELETE dupRel
    `)
    res.json({ ok: true, message: 'Österreich-Bereinigung abgeschlossen' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// =============================================================
// Server starten
// =============================================================
const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`)
})

process.on('SIGINT', async () => {
  await driver.close()
  process.exit(0)
})