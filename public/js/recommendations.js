// Empfehlungen-Tab: HTML-Template + Collaborative Filtering

function getRecommendationsTemplate() {
  return `
    <section id="tab-recommendations" class="tab-section">
      <h1>Reiseempfehlungen</h1>
      <p class="hint">Personalisierte Empfehlungen auf Basis &auml;hnlicher Nutzer und deiner Kategorie-Pr&auml;ferenz.</p>

      <div class="panel">
        <label><strong>Nutzer w&auml;hlen:</strong></label>
        <select id="rec-user-select" style="margin: 0 0.5rem">
          <option value="">&ndash; Nutzer w&auml;hlen &ndash;</option>
        </select>
        <button class="btn btn-primary" onclick="loadRecommendations()">Empfehlungen anzeigen</button>
      </div>

      <div id="rec-query" class="query-area"></div>
      <div id="rec-cards"></div>
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

  document.getElementById('rec-cards').innerHTML = '<p class="empty-msg">Wird geladen…</p>'

  try {
    const result = await Api.recommendations(userId)
    renderQueryBox(result, document.getElementById('rec-query'))
    renderRecCards(result.data, document.getElementById('rec-cards'))
  } catch (e) {
    toast('Fehler bei Empfehlungen: ' + e.message, 'error')
    document.getElementById('rec-cards').innerHTML = '<p class="empty-msg">Fehler beim Laden.</p>'
  }
}

function renderRecCards(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="rec-empty">
        <div class="rec-empty-icon">&#128214;</div>
        <p>Keine Empfehlungen gefunden.</p>
        <p class="rec-empty-hint">Der Nutzer hat noch keine Buchungen oder es gibt keine &auml;hnlichen Nutzer.</p>
      </div>
    `
    return
  }

  const maxScore = Math.max(...data.map(d => d.score ?? 0)) || 1

  const html = data.map(item => {
    const stars    = renderStars(item.rating ?? 0)
    const scorePct = Math.round(((item.score ?? 0) / maxScore) * 100)
    return `
      <div class="rec-card">
        <div class="rec-card-top">
          <span class="rec-card-category">${escHtml(item.kategorie ?? item.typ ?? '–')}</span>
          <span class="rec-card-rating">${stars}
            <span class="rec-card-ratingval">${item.rating ?? '–'}</span>
          </span>
        </div>
        <div class="rec-card-name">${escHtml(item.property)}</div>
        <div class="rec-card-type">${escHtml(item.typ ?? '–')}</div>
        <div class="rec-card-score">
          <div class="rec-card-score-label">Relevanz</div>
          <div class="rec-card-score-bar">
            <div class="rec-card-score-fill" style="width:${scorePct}%"></div>
          </div>
          <div class="rec-card-score-val">Score: ${item.score ?? 0}</div>
        </div>
      </div>
    `
  }).join('')

  container.innerHTML = `<div class="rec-cards">${html}</div>`
}

function renderStars(rating) {
  const filled = Math.round(rating)
  return '★'.repeat(filled) + '☆'.repeat(Math.max(0, 5 - filled))
}
