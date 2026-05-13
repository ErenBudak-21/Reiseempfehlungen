// Empfehlungen-Tab: HTML-Template + Collaborative Filtering

function getRecommendationsTemplate() {
  return `
    <section id="tab-recommendations" class="tab-section">
      <h1>Reiseempfehlungen</h1>

      <div class="panel">
        <label><strong>Nutzer w&auml;hlen:</strong></label>
        <select id="rec-user-select" style="margin: 0 0.5rem">
          <option value="">&ndash; Nutzer w&auml;hlen &ndash;</option>
        </select>
        <button class="btn btn-primary" onclick="loadRecommendations()">Empfehlungen anzeigen</button>
      </div>

      <div class="panel">
        <div id="rec-query" class="query-area"></div>
        <div id="rec-results"></div>
      </div>
    </section>
  `
}

// ── Logik ────────────────────────────────────────────────────

async function initRecommendations() {
  const sel = document.getElementById('rec-user-select')
  try {
    const result = await Api.getUsers()
    fillSelect(sel, result.data, 'id', 'name', '– Nutzer wählen –')
  } catch (e) {
    sel.innerHTML = '<option value="">Fehler beim Laden</option>'
  }
}

async function loadRecommendations() {
  const userId = document.getElementById('rec-user-select').value
  if (!userId) { toast('Bitte einen Nutzer wählen', 'error'); return }

  try {
    const result = await Api.recommendations(userId)
    showResult(result, document.getElementById('rec-query'), document.getElementById('rec-results'))
  } catch (e) {
    toast('Fehler bei Empfehlungen: ' + e.message, 'error')
  }
}
