// Einstiegspunkt: baut die App aus den Modul-Templates zusammen,
// steuert Navigation und lädt gemeinsame Stammdaten

let _categories = []
let _cities = []

document.addEventListener('DOMContentLoaded', async () => {
  buildApp()
  setupNav()
  await loadSharedData()
  switchTab('dashboard')
})

// Alle Tab-Inhalte per Template-Funktion in den App-Container rendern
function buildApp() {
  document.getElementById('app').innerHTML = [
    getDashboardTemplate(),
    getUsersTemplate(),
    getPropertiesTemplate(),
    getBookingsTemplate(),
    getPathsTemplate(),
    getStatsTemplate(),
    getRecommendationsTemplate()
  ].join('')
}

function setupNav() {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault()
      switchTab(link.dataset.tab)
    })
  })
}

function switchTab(tabName) {
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
  document.querySelectorAll('.tab-section').forEach(s => s.classList.remove('active'))

  const link    = document.querySelector(`.nav-link[data-tab="${tabName}"]`)
  const section = document.getElementById(`tab-${tabName}`)
  if (!link || !section) return

  link.classList.add('active')
  section.classList.add('active')

  switch (tabName) {
    case 'dashboard':       initDashboard();        break
    case 'users':           initUsers();             break
    case 'properties':      initProperties();        break
    case 'bookings':        initBookings();          break
    case 'paths':           initPaths();             break
    case 'stats':           loadStats();             break
    case 'recommendations': initRecommendations();   break
  }
}

// Gemeinsame Stammdaten (Kategorien + Städte) für Dropdowns laden
async function loadSharedData() {
  try {
    const [catRes, cityRes] = await Promise.all([
      Api.getCategories(),
      Api.getCities()
    ])
    _categories = catRes.data
    _cities     = cityRes.data
  } catch (e) {
    // Fehler werden in den jeweiligen Tabs angezeigt
  }
}

// ── Dashboard Template & Logik ────────────────────────────────

function getDashboardTemplate() {
  return `
    <section id="tab-dashboard" class="tab-section">
      <h1>Dashboard</h1>
      <div id="dashboard-cards" class="cards-row"></div>
    </section>
  `
}

async function initDashboard() {
  try {
    const result = await Api.dashboard()
    const d = result.data[0] || {}
    document.getElementById('dashboard-cards').innerHTML = `
      <div class="card">
        <div class="card-val">${d.users ?? 0}</div>
        <div class="card-label">Nutzer</div>
      </div>
      <div class="card">
        <div class="card-val">${d.properties ?? 0}</div>
        <div class="card-label">Unterk&uuml;nfte</div>
      </div>
      <div class="card">
        <div class="card-val">${d.bookings ?? 0}</div>
        <div class="card-label">Buchungen</div>
      </div>
      <div class="card">
        <div class="card-val">${d.avg_preis != null ? d.avg_preis + ' €' : '–'}</div>
        <div class="card-label">&Oslash; Buchungspreis</div>
      </div>
    `
  } catch (e) {
    toast('Dashboard konnte nicht geladen werden: ' + e.message, 'error')
  }
}
