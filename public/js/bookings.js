// Buchungen-Tab: HTML-Template + Verknüpfungen (User)-[:MADE]->(Booking)-[:FOR]->(Property)

function getBookingsTemplate() {
  return `
    <section id="tab-bookings" class="tab-section">
      <h1>Buchungen</h1>
      <div class="panel">
        <h2>Filter / Suche</h2>
        <div class="filter-row">
          <select id="booking-filter-user"><option value="">Alle Nutzer</option></select>
          <select id="booking-filter-property"><option value="">Alle Unterk&uuml;nfte</option></select>
          <button class="btn btn-primary" onclick="searchBookings()">Suchen</button>
          <button class="btn btn-secondary" onclick="clearBookingFilter()">Zur&uuml;cksetzen</button>
        </div>
      </div>
      <div class="panel">
        <h2>Buchung erfassen</h2>
        <form id="booking-form" class="form-grid">
          <div class="form-row">
            <label for="booking-user">Nutzer</label>
            <select id="booking-user"><option value="">&ndash; Nutzer w&auml;hlen &ndash;</option></select>
          </div>
          <div class="form-row">
            <label for="booking-property">Unterkunft</label>
            <select id="booking-property"><option value="">&ndash; Unterkunft w&auml;hlen &ndash;</option></select>
          </div>
          <div class="form-row">
            <label for="booking-checkin">Check-In</label>
            <input type="date" id="booking-checkin">
          </div>
          <div class="form-row">
            <label for="booking-checkout">Check-Out</label>
            <input type="date" id="booking-checkout">
          </div>
          <div class="form-row">
            <label for="booking-price">Preis (&euro;)</label>
            <input type="number" id="booking-price" placeholder="350" step="10" min="0">
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Buchung anlegen</button>
          </div>
        </form>
      </div>
      <div class="panel">
        <div class="panel-header">
          <h2>Alle Buchungen</h2>
          <button class="btn btn-sm" onclick="loadBookings()">Aktualisieren</button>
        </div>
        <div id="bookings-table"></div>
      </div>
    </section>
  `
}

// ── Logik ────────────────────────────────────────────────────

let _bookingsCache = []

async function initBookings() {
  try {
    fillSelect(document.getElementById('booking-user'),
      (await Api.getUsers()).data, 'id', 'name', '– Nutzer wählen –')
  } catch { document.getElementById('booking-user').innerHTML = '<option value="">Fehler</option>' }

  try {
    const props = (await Api.getProperties({})).data
      .map(p => ({ id: p.id, label: `${p.name} (${p.stadt ?? '?'})` }))
    fillSelect(document.getElementById('booking-property'), props, 'id', 'label', '– Unterkunft wählen –')
  } catch { document.getElementById('booking-property').innerHTML = '<option value="">Fehler</option>' }

  setupBookingForm()
  await loadBookings()
}

function bookingActions(row) {
  return `<button class="btn btn-xs btn-delete"
    onclick="confirmDeleteBooking('${escHtml(row.id)}')">L&ouml;schen</button>`
}

async function loadBookings() {
  try {
    const result = await Api.getBookings()
    _bookingsCache = result.data
    const users = [...new Set(_bookingsCache.map(b => b.user))].sort()
    const props = [...new Set(_bookingsCache.map(b => b.property))].sort()
    fillSelect(document.getElementById('booking-filter-user'),     users.map(u => ({v: u})), 'v', 'v', 'Alle Nutzer')
    fillSelect(document.getElementById('booking-filter-property'), props.map(p => ({v: p})), 'v', 'v', 'Alle Unterkünfte')
    renderTable(_bookingsCache, document.getElementById('bookings-table'), bookingActions)
  } catch (e) { toast('Buchungen konnten nicht geladen werden: ' + e.message, 'error') }
}

function searchBookings() {
  const user = document.getElementById('booking-filter-user').value
  const prop = document.getElementById('booking-filter-property').value
  const filtered = _bookingsCache.filter(b =>
    (!user || b.user === user) && (!prop || b.property === prop)
  )
  renderTable(filtered, document.getElementById('bookings-table'), bookingActions)
}

function clearBookingFilter() {
  document.getElementById('booking-filter-user').value     = ''
  document.getElementById('booking-filter-property').value = ''
  renderTable(_bookingsCache, document.getElementById('bookings-table'), bookingActions)
}

function setupBookingForm() {
  document.getElementById('booking-form').onsubmit = async (e) => {
    e.preventDefault()
    const userId     = document.getElementById('booking-user').value
    const propertyId = document.getElementById('booking-property').value
    const checkIn    = document.getElementById('booking-checkin').value
    const checkOut   = document.getElementById('booking-checkout').value
    const price      = document.getElementById('booking-price').value

    const fehlend = [
      [userId,     'Nutzer'], [propertyId, 'Unterkunft'],
      [checkIn,    'Check-In'], [checkOut,   'Check-Out'], [price, 'Preis'],
    ].filter(([v]) => !v).map(([, l]) => l)
    if (fehlend.length) { toast('Bitte trage noch ein: ' + fehlend.join(', '), 'error'); return }

    try {
      await Api.createBooking({ userId, propertyId, checkIn, checkOut, price })
      toast('Buchung erfolgreich angelegt')
      document.getElementById('booking-form').reset()
      await loadBookings()
    } catch (e) { toast('Fehler: ' + e.message, 'error') }
  }
}

async function confirmDeleteBooking(id) {
  if (!confirm(`Buchung "${id}" wirklich löschen?`)) return
  try {
    await Api.deleteBooking(id)
    toast('Buchung gelöscht')
    await loadBookings()
  } catch (e) { toast('Fehler beim Löschen: ' + e.message, 'error') }
}
