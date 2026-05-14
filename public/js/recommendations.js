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
    renderRecommendations(result.data, document.getElementById('rec-results'))
  } catch (e) {
    toast('Fehler bei Empfehlungen: ' + e.message, 'error')
  }
}

function renderRecommendations(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty-msg">Keine Empfehlungen gefunden.</p>'
    return
  }

  let html = '<div class="table-wrap"><table><thead><tr>'
  html += '<th>Unterkunft</th><th>Typ</th><th>Kategorie</th>'
  html += '<th>Rating</th><th>Score</th><th>Basierend auf</th>'
  html += '</tr></thead><tbody>'

  data.forEach(row => {
    const nutzer = Array.isArray(row.basierend_auf)
      ? row.basierend_auf.join(', ')
      : (row.basierend_auf ?? '–')

    html += `<tr>
      <td>${escHtml(row.property)}</td>
      <td>${escHtml(row.typ)}</td>
      <td>${escHtml(row.kategorie)}</td>
      <td>${escHtml(row.rating)}</td>
      <td>${escHtml(row.score)}</td>
      <td style="color:var(--text-muted);font-size:0.85rem">${escHtml(nutzer)} hat diese Unterkunft ebenfalls gebucht</td>
    </tr>`
  })

  html += '</tbody></table></div>'
  container.innerHTML = html
}
