// Buchungen-Tab: HTML-Template + Verknüpfungen (User)-[:MADE]->(Booking)-[:FOR]->(Property)

function getBookingsTemplate() {
  return `
    <section id="tab-bookings" class="tab-section">
      <h1>Buchungen</h1>

      <div class="panel">
        <h2>Buchung erfassen</h2>
        <form id="booking-form" class="form-grid">
          <input type="hidden" id="booking-id">
          <div class="form-row">
            <label for="booking-user">Nutzer</label>
            <select id="booking-user">
              <option value="">&ndash; Nutzer w&auml;hlen &ndash;</option>
            </select>
          </div>
          <div class="form-row">
            <label for="booking-property">Unterkunft</label>
            <select id="booking-property">
              <option value="">&ndash; Unterkunft w&auml;hlen &ndash;</option>
            </select>
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
            <input type="number" id="booking-price" placeholder="350" step="0.01" min="0">
          </div>
          <div class="form-row">
            <label for="booking-guests">G&auml;ste</label>
            <input type="number" id="booking-guests" placeholder="2" min="1">
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
        <div id="bookings-query" class="query-area"></div>
        <div id="bookings-table"></div>
      </div>
    </section>
  `
}

// ── Logik ────────────────────────────────────────────────────

let _bookingPropertiesCache = []
let _bookingsCache = []

async function initBookings() {
  await Promise.all([
    populateBookingUsers(),
    populateBookingProperties()
  ])
  setupBookingForm()
  await loadBookings()
}

async function populateBookingUsers() {
  const sel = document.getElementById('booking-user')
  try {
    const result = await Api.getUsers()
    fillSelect(sel, result.data, 'id', 'name', '– Nutzer wählen –')
  } catch (e) {
    sel.innerHTML = '<option value="">Fehler beim Laden</option>'
  }
}

async function populateBookingProperties() {
  const sel = document.getElementById('booking-property')
  try {
    const result = await Api.getProperties({})
    _bookingPropertiesCache = result.data
    const items = result.data.map(p => ({
      id:    p.id,
      label: `${p.name} (${p.stadt ?? '?'}) – ${p.preis ?? '?'} €/Nacht`
    }))
    fillSelect(sel, items, 'id', 'label', '– Unterkunft wählen –')
  } catch (e) {
    sel.innerHTML = '<option value="">Fehler beim Laden</option>'
  }
}

async function loadBookings() {
  try {
    const result = await Api.getBookings()
    _bookingsCache = result.data
    document.getElementById('booking-id').value = nextId('B', _bookingsCache)
    showResult(
      result,
      document.getElementById('bookings-query'),
      document.getElementById('bookings-table'),
      row => `
        <button class="btn btn-xs btn-delete"
          onclick="confirmDeleteBooking('${escHtml(row.id)}')">L&ouml;schen</button>
      `
    )
  } catch (e) {
    toast('Buchungen konnten nicht geladen werden: ' + e.message, 'error')
  }
}

function setupBookingForm() {
  document.getElementById('booking-property').onchange = function () {
    const prop = _bookingPropertiesCache.find(p => p.id === this.value)
    if (prop && prop.preis) {
      document.getElementById('booking-price').value = prop.preis
    }
  }

  document.getElementById('booking-form').onsubmit = async (e) => {
    e.preventDefault()
    const userId     = document.getElementById('booking-user').value
    const propertyId = document.getElementById('booking-property').value
    if (!userId)     { toast('Bitte einen Nutzer wählen', 'error');     return }
    if (!propertyId) { toast('Bitte eine Unterkunft wählen', 'error'); return }

    const data = {
      id:        document.getElementById('booking-id').value || nextId('B', _bookingsCache),
      userId,
      propertyId,
      checkIn:   document.getElementById('booking-checkin').value,
      checkOut:  document.getElementById('booking-checkout').value,
      price:     document.getElementById('booking-price').value,
      numGuests: document.getElementById('booking-guests').value,
    }
    try {
      await Api.createBooking(data)
      toast('Buchung erfolgreich angelegt')
      document.getElementById('booking-form').reset()
      await loadBookings()
    } catch (e) {
      toast('Fehler: ' + e.message, 'error')
    }
  }
}

async function confirmDeleteBooking(id) {
  if (!confirm(`Buchung "${id}" wirklich löschen?`)) return
  try {
    await Api.deleteBooking(id)
    toast('Buchung gelöscht')
    await loadBookings()
  } catch (e) {
    toast('Fehler beim Löschen: ' + e.message, 'error')
  }
}
