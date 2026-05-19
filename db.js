require('dotenv').config()
const neo4j = require('neo4j-driver')

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
)

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

async function runQuery(query, params = {}) {
  const session = driver.session()
  try {
    const result = await session.run(query, params)
    return {
      data: result.records.map(record => {
        const obj = {}
        record.keys.forEach(key => { obj[key] = cleanValue(record.get(key)) })
        return obj
      })
    }
  } finally {
    await session.close()
  }
}

module.exports = { driver, runQuery }
