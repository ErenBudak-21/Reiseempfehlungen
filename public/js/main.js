// Einstiegspunkt: App aufbauen, Navigation steuern, Stammdaten laden

let _categories = []
let _cities = []

document.addEventListener('DOMContentLoaded', async () => {
  buildApp()
  setupNav()
  await loadSharedData()
  switchTab('dashboard')
})

// Alle Tab-Inhalte per Modul-Template in den App-Container rendern
function buildApp() {
  document.getElementById('app').innerHTML = [
    getDashboardTemplate(),
    getUsersTemplate(),
    getPropertiesTemplate(),
    getBookingsTemplate(),
    getPathsTemplate(),
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
    case 'recommendations': initRecommendations();   break
  }
}

// Gemeinsame Stammdaten für Dropdowns laden
async function loadSharedData() {
  try {
    const [catRes, cityRes] = await Promise.all([
      Api.getCategories(),
      Api.getCities()
    ])
    _categories = catRes.data
    _cities     = cityRes.data
  } catch (e) { /* Fehler erscheinen in den jeweiligen Tabs */ }
}

// ── Dashboard: Überblickszahlen + Aggregation ─────────────────

function getDashboardTemplate() {
  return `
    <section id="tab-dashboard" class="tab-section">
      <h1>Dashboard</h1>
      <div id="dashboard-cards" class="cards-row"></div>
      <div class="grid-2">
        <div class="panel">
          <h2>&Oslash; Buchungspreis nach Stadt
            <small style="font-weight:normal">&nbsp;(Rating &ge; 4)</small>
          </h2>
          <div id="dashboard-stats"></div>
        </div>
        <div class="panel">
          <h2>Buchungen &amp; Umsatz nach Kategorie</h2>
          <div id="dashboard-category-stats"></div>
        </div>
      </div>
    </section>
  `
}

async function initDashboard() {
  try {
    const [dashRes, statsRes, catRes] = await Promise.all([
      Api.dashboard(),
      Api.avgPriceByCity(),
      Api.bookingsByCategory()
    ])

    const d = dashRes.data[0] || {}
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

    renderTable(statsRes.data, document.getElementById('dashboard-stats'))
    renderTable(catRes.data,   document.getElementById('dashboard-category-stats'))
  } catch (e) {
    toast('Dashboard konnte nicht geladen werden: ' + e.message, 'error')
  }
}
