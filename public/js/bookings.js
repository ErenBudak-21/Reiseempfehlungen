// Buchungen-Tab: Verknüpfungen (User)-[:MADE]->(Booking)-[:FOR]->(Property)

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
        <button class="btn btn-xs btn-delete" onclick="confirmDeleteBooking('${escHtml(row.id)}')">L&ouml;schen</button>
      `
    )
  } catch (e) {
    toast('Buchungen konnten nicht geladen werden: ' + e.message, 'error')
  }
}

function setupBookingForm() {
  // Preis automatisch aus gewählter Unterkunft befüllen
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
      id:        document.getElementById('booking-id').value.trim() || genId('b'),
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
      await loadBookings() // setzt die nächste ID automatisch neu
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
