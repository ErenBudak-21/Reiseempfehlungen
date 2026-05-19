const { Router } = require('express')
const { runQuery } = require('../db')
const router = Router()

router.get('/dashboard', async (req, res) => {
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

router.get('/stats/avg-price-by-city', async (req, res) => {
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

router.get('/stats/bookings-by-category', async (req, res) => {
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

module.exports = router
