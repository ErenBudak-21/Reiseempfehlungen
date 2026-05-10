// Empfehlungen-Tab: Reisevorschlag per Collaborative Filtering

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
  if (!userId) {
    toast('Bitte einen Nutzer wählen', 'error')
    return
  }

  const queryEl = document.getElementById('rec-query')
  const cardsEl = document.getElementById('rec-cards')

  cardsEl.innerHTML = '<p class="empty-msg">Wird geladen…</p>'

  try {
    const result = await Api.recommendations(userId)
    renderQueryBox(result, queryEl)
    renderRecCards(result.data, cardsEl)
  } catch (e) {
    toast('Fehler bei Empfehlungen: ' + e.message, 'error')
    cardsEl.innerHTML = '<p class="empty-msg">Fehler beim Laden.</p>'
  }
}

function renderRecCards(data, container) {
  if (!data || data.length === 0) {
    container.innerHTML = `
      <div class="rec-empty">
        <div class="rec-empty-icon">&#128214;</div>
        <p>Keine Empfehlungen gefunden.</p>
        <p class="rec-empty-hint">Der Nutzer hat noch keine Buchungen oder es gibt keine ähnlichen Nutzer.</p>
      </div>
    `
    return
  }

  const maxScore = Math.max(...data.map(d => d.score ?? 0)) || 1

  const html = data.map(item => {
    const stars     = renderStars(item.rating ?? 0)
    const scorePct  = Math.round(((item.score ?? 0) / maxScore) * 100)
    const kategorie = item.kategorie ?? item.typ ?? '–'

    return `
      <div class="rec-card">
        <div class="rec-card-top">
          <span class="rec-card-category">${escHtml(kategorie)}</span>
          <span class="rec-card-rating">${stars} <span class="rec-card-ratingval">${item.rating ?? '–'}</span></span>
        </div>
        <div class="rec-card-name">${escHtml(item.property)}</div>
        <div class="rec-card-type">${escHtml(item.typ ?? '–')}</div>
        <div class="rec-card-score">
          <div class="rec-card-score-label">Relevanz</div>
          <div class="rec-card-score-bar">
            <div class="rec-card-score-fill" style="width: ${scorePct}%"></div>
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
