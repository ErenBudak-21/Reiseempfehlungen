const { Router } = require('express')
const { runQuery } = require('../db')
const router = Router()

router.get('/users', async (req, res) => {
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

router.post('/users', async (req, res) => {
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

router.put('/users/:id', async (req, res) => {
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

router.delete('/users/:id', async (req, res) => {
  try {
    const result = await runQuery(`
      MATCH (u:User {id: $id})
      OPTIONAL MATCH (u)-[:MADE]->(b:Booking)
      DETACH DELETE u, b
    `, { id: req.params.id })
    res.json(result)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

module.exports = router
