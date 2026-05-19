const { Router } = require('express')
const { runQuery } = require('../db')
const router = Router()

// ── Buchungen CRUD ────────────────────────────────────────────

router.get('/bookings', async (req, res) => {
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

router.post('/bookings', async (req, res) => {
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

router.delete('/bookings/:id', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (b:Booking {id: $id})
      DETACH DELETE b
    `, { id: req.params.id })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

// ── Pfadabfragen ──────────────────────────────────────────────

router.get('/path/bookings-by-user/:userId', async (req, res) => {
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

router.get('/path/full-journey/:userId', async (req, res) => {
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

module.exports = router
