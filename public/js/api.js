// REST-API Zugriffslayer – alle Fetch-Aufrufe zentral gebündelt

const API_BASE = '/api'

async function apiFetch(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body !== undefined) opts.body = JSON.stringify(body)

  const res = await fetch(API_BASE + path, opts)
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`)
  return json
}

const Api = {
  // Dashboard
  dashboard:          ()           => apiFetch('GET',    '/dashboard'),

  // Nutzer (CRUD)
  getUsers:           ()           => apiFetch('GET',    '/users'),
  createUser:         (d)          => apiFetch('POST',   '/users', d),
  updateUser:         (id, d)      => apiFetch('PUT',    `/users/${id}`, d),
  deleteUser:         (id)         => apiFetch('DELETE', `/users/${id}`),

  // Unterkünfte (CRUD + Suche mit Filtern)
  getProperties:      (params)     => {
    const qs = new URLSearchParams(params).toString()
    return apiFetch('GET', '/properties' + (qs ? '?' + qs : ''))
  },
  createProperty:     (d)          => apiFetch('POST',   '/properties', d),
  updateProperty:     (id, d)      => apiFetch('PUT',    `/properties/${id}`, d),
  deleteProperty:     (id)         => apiFetch('DELETE', `/properties/${id}`),

  // Buchungen – Verknüpfungen zwischen User und Property
  getBookings:        ()           => apiFetch('GET',    '/bookings'),
  createBooking:      (d)          => apiFetch('POST',   '/bookings', d),
  deleteBooking:      (id)         => apiFetch('DELETE', `/bookings/${id}`),

  // Pfadabfragen
  bookingsByUser:     (uid)        => apiFetch('GET',    `/path/bookings-by-user/${uid}`),
  fullJourney:        (uid)        => apiFetch('GET',    `/path/full-journey/${uid}`),

  // Aggregation / Statistiken
  avgPriceByCity:     ()           => apiFetch('GET',    '/stats/avg-price-by-city'),
  bookingsByCategory: ()           => apiFetch('GET',    '/stats/bookings-by-category'),

  // Reiseempfehlungen
  recommendations:    (uid)        => apiFetch('GET',    `/recommendations/${uid}`),

  // Hilfsdaten für Dropdowns
  getCategories:      ()           => apiFetch('GET',    '/categories'),
  getCities:          ()           => apiFetch('GET',    '/cities'),
  getCountries:       ()           => apiFetch('GET',    '/countries'),
}
