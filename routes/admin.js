const { Router } = require('express')
const { runQuery } = require('../db')
const router = Router()

router.delete('/admin/orphan-bookings', async (req, res) => {
  try {
    await runQuery(`
      MATCH (b:Booking)
      WHERE NOT (:User)-[:MADE]->(b) OR NOT (b)-[:FOR]->(:Property)
      DETACH DELETE b
    `)
    res.json({ ok: true, message: 'Verwaiste Buchungen gelöscht' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

router.post('/admin/fix-austria', async (req, res) => {
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

module.exports = router
