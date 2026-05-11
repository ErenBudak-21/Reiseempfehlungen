// Pfadabfragen-Tab: HTML-Template + 2-Hop und 4er-Ketten-Traversierung

function getPathsTemplate() {
  return `
    <section id="tab-paths" class="tab-section">
      <h1>Pfadabfragen</h1>

      <div class="panel">
        <label><strong>Nutzer w&auml;hlen:</strong></label>
        <select id="path-user-select" style="margin: 0 0.5rem">
          <option value="">&ndash; Nutzer w&auml;hlen &ndash;</option>
        </select>
        <button class="btn btn-primary" onclick="runPaths()">Abfragen</button>
      </div>

      <div class="grid-2">
        <div class="panel">
          <h2>Buchungen des Nutzers</h2>
          <div id="path2-query" class="query-area"></div>
          <div id="path2-table"></div>
        </div>
        <div class="panel">
          <h2>Reiseverlauf (Nutzer &rarr; Unterkunft &rarr; Stadt &rarr; Land)</h2>
          <div id="path4-query" class="query-area"></div>
          <div id="path4-table"></div>
        </div>
      </div>
    </section>
  `
}

// ── Logik ────────────────────────────────────────────────────

async function initPaths() {
  const sel = document.getElementById('path-user-select')
  try {
    const result = await Api.getUsers()
    fillSelect(sel, result.data, 'id', 'name', '– Nutzer wählen –')
  } catch (e) {
    sel.innerHTML = '<option value="">Fehler beim Laden</option>'
  }
}

async function runPaths() {
  const userId = document.getElementById('path-user-select').value
  if (!userId) { toast('Bitte einen Nutzer wählen', 'error'); return }

  try {
    const [res2, res4] = await Promise.all([
      Api.bookingsByUser(userId),
      Api.fullJourney(userId)
    ])
    showResult(res2, document.getElementById('path2-query'), document.getElementById('path2-table'))
    showResult(res4, document.getElementById('path4-query'), document.getElementById('path4-table'))
  } catch (e) {
    toast('Fehler bei Pfadabfrage: ' + e.message, 'error')
  }
}
