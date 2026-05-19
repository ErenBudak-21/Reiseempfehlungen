// Gemeinsame UI-Hilfsfunktionen

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Queries werden nur in queries/cypher-queries.md dokumentiert, nicht im Frontend angezeigt
function renderQueryBox(_result, container) {
  if (container) container.innerHTML = ''
}

const _headerLabels = {
  'id': 'ID', 'name': 'Name', 'email': 'E-Mail',
  'präferenz': 'Präferenz', 'user': 'Nutzer', 'property': 'Unterkunft',
  'checkIn': 'Check-In', 'checkOut': 'Check-Out', 'preis': 'Preis (€)',
  'stadt': 'Stadt', 'land': 'Land', 'kategorie': 'Kategorie',
  'rating': 'Rating', 'typ': 'Typ', 'type': 'Typ', 'score': 'Score',
  'buchungen': 'Buchungen', 'anzahl_buchungen': 'Buchungen',
  'durchschnittspreis': 'Ø Preis (€)', 'avg_rating': 'Ø Rating',
  'gesamtumsatz': 'Umsatz (€)', 'basierend_auf': 'Basierend auf',
  'datum': 'Datum', 'buchung': 'Buchung',
}

function formatHeader(key) {
  return _headerLabels[key] || key.replace(/_/g, ' ')
}

// Rendert ein Array von Objekten als HTML-Tabelle
function renderTable(data, container, actions) {
  if (!data || data.length === 0) {
    container.innerHTML = '<p class="empty-msg">Keine Eintr&auml;ge gefunden.</p>'
    return
  }

  const keys = Object.keys(data[0])
  let html = '<div class="table-wrap"><table><thead><tr>'
  keys.forEach(k => { html += `<th>${escHtml(formatHeader(k))}</th>` })
  if (actions) html += '<th>Aktionen</th>'
  html += '</tr></thead><tbody>'

  data.forEach(row => {
    html += '<tr>'
    keys.forEach(k => { html += `<td>${escHtml(row[k])}</td>` })
    if (actions) html += `<td class="action-cell">${actions(row)}</td>`
    html += '</tr>'
  })

  html += '</tbody></table></div>'
  container.innerHTML = html
}

// Kombiniert renderQueryBox + renderTable aus einem API-Result-Objekt
function showResult(result, queryEl, tableEl, actions) {
  renderQueryBox(result, queryEl)
  renderTable(result.data, tableEl, actions)
}

// Füllt ein <select>-Element mit Optionen
function fillSelect(selectEl, items, valueKey, labelKey, emptyLabel) {
  const current = selectEl.value
  selectEl.innerHTML = emptyLabel
    ? `<option value="">${escHtml(emptyLabel)}</option>`
    : ''
  items.forEach(item => {
    const opt = document.createElement('option')
    opt.value = item[valueKey]
    opt.textContent = item[labelKey]
    selectEl.appendChild(opt)
  })
  if (current) selectEl.value = current
}

// Stern-Bewertungs-Widget (generisch, wiederverwendbar)
function initStarRating(containerId, inputId) {
  const container = document.getElementById(containerId)
  const input     = document.getElementById(inputId)
  container.querySelectorAll('.star').forEach(star => {
    star.addEventListener('click', () => {
      input.value = star.dataset.value
      highlightStars(containerId, parseInt(star.dataset.value))
    })
    star.addEventListener('mouseenter', () => highlightStars(containerId, parseInt(star.dataset.value)))
  })
  container.addEventListener('mouseleave', () => highlightStars(containerId, parseInt(input.value) || 0))
}

function highlightStars(containerId, count) {
  document.querySelectorAll(`#${containerId} .star`).forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.value) <= count)
  })
}

// Zeigt eine kurze Toast-Benachrichtigung
function toast(msg, type = 'success') {
  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.textContent = msg
  document.getElementById('toast-container').appendChild(el)
  setTimeout(() => el.classList.add('fade-out'), 2500)
  setTimeout(() => el.remove(), 3000)
}

// Berechnet die nächste ID im Format PREFIX + 2-stellige Zahl (z.B. B12, U05, P03)
// Liest den höchsten vorhandenen numerischen Suffix aus items und inkrementiert
function nextId(prefix, items, idKey = 'id') {
  const nums = (items || [])
    .map(item => parseInt(String(item[idKey] ?? '').replace(/^[A-Za-z]+/, ''), 10))
    .filter(n => !isNaN(n))
  const max = nums.length ? Math.max(...nums) : 0
  return prefix + String(max + 1).padStart(2, '0')
}
