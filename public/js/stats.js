// Statistiken-Tab: HTML-Template + Aggregationsabfragen

function getStatsTemplate() {
  return `
    <section id="tab-stats" class="tab-section">
      <h1>Statistiken</h1>

      <div class="grid-2">
        <div class="panel">
          <div class="panel-header">
            <h2>&Oslash; Preis pro Stadt <small style="font-weight:normal">(Rating &ge; 4)</small></h2>
            <button class="btn btn-sm" onclick="loadStats()">Laden</button>
          </div>
          <div id="stats-city-query" class="query-area"></div>
          <div id="stats-city-table"></div>
        </div>
        <div class="panel">
          <h2>Buchungen &amp; Umsatz pro Kategorie</h2>
          <div id="stats-cat-query" class="query-area"></div>
          <div id="stats-cat-table"></div>
        </div>
      </div>
    </section>
  `
}

// ── Logik ────────────────────────────────────────────────────

async function loadStats() {
  try {
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
