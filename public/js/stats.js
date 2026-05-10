// Statistiken-Tab: Aggregation mit Filter

async function loadStats() {
  try {
    // Beide Aggregationsabfragen parallel laden
    const [cityRes, catRes] = await Promise.all([
      Api.avgPriceByCity(),
      Api.bookingsByCategory()
    ])

    showResult(cityRes, document.getElementById('stats-city-query'), document.getElementById('stats-city-table'))
    showResult(catRes,  document.getElementById('stats-cat-query'),  document.getElementById('stats-cat-table'))
  } catch (e) {
    toast('Statistiken konnten nicht geladen werden: ' + e.message, 'error')
  }
}
