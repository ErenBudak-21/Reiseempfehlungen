const { Router } = require('express')
const { runQuery } = require('../db')
const router = Router()

router.get('/recommendations/:userId', async (req, res) => {
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

module.exports = router
