const { Router } = require('express')
const { runQuery } = require('../db')
const router = Router()

router.get('/properties', async (req, res) => {
  const { category, city, minRating } = req.query
  const params = {}

  const mainConds = []
  if (city)      { mainConds.push('city.name = $city');       params.city      = city }
  if (minRating) { mainConds.push('p.rating >= $minRating'); params.minRating = parseFloat(minRating) }
  const mainWhere = mainConds.length ? 'WHERE ' + mainConds.join(' AND ') : ''

  let catClause
  if (category) {
    catClause = 'MATCH (p)-[:OF_CATEGORY]->(cat:Category) WHERE cat.name = $category'
    params.category = category
  } else {
    catClause = 'OPTIONAL MATCH (p)-[:OF_CATEGORY]->(cat:Category)'
  }

  try {
    const result = await runQuery(`
      MATCH (p:Property)-[:LOCATED_IN]->(city:City)
      ${mainWhere}
      OPTIONAL MATCH (city)-[:IN_COUNTRY]->(country:Country)
      WITH p, city, collect(country)[0] AS country
      ${catClause}
      RETURN p.id AS id, p.name AS name, p.type AS type,
             p.pricePerNight AS preis, p.rating AS rating,
             city.name AS stadt, country.name AS land, cat.name AS kategorie
      ORDER BY toInteger(substring(p.id, 1)) ASC
    `, params)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/properties', async (req, res) => {
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

router.put('/properties/:id', async (req, res) => {
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

router.delete('/properties/:id', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (p:Property {id: $id})
      DETACH DELETE p
    `, { id: req.params.id })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// Hilfsdaten für Dropdowns
router.get('/categories', async (req, res) => {
  try {
    const result = await runQuery(`MATCH (c:Category) RETURN c.name AS name ORDER BY c.name`)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/cities', async (req, res) => {
  try {
    const result = await runQuery(`MATCH (c:City) RETURN c.name AS name ORDER BY c.name`)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.get('/countries', async (req, res) => {
  try {
    const result = await runQuery(`MATCH (c:Country) RETURN c.name AS name ORDER BY c.name`)
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
