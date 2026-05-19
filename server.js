const express = require('express')
const cors    = require('cors')
const { driver } = require('./db')

const app = express()
app.use(cors())
app.use(express.json())
app.use(express.static('public'))

app.use('/api', require('./routes/users'))
app.use('/api', require('./routes/properties'))
app.use('/api', require('./routes/bookings'))
app.use('/api', require('./routes/stats'))
app.use('/api', require('./routes/recommendations'))
app.use('/api', require('./routes/admin'))

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server läuft auf http://localhost:${PORT}`))
process.on('SIGINT', async () => { await driver.close(); process.exit(0) })
