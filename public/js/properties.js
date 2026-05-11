// Unterkünfte-Tab: HTML-Template + CRUD und gefilterte Suche für (:Property)-Knoten

function getPropertiesTemplate() {
  return `
    <section id="tab-properties" class="tab-section">
      <h1>Unterk&uuml;nfte</h1>

      <div class="panel">
        <h2>Filter / Suche</h2>
        <div class="filter-row">
          <select id="prop-filter-category">
            <option value="">Alle Kategorien</option>
          </select>
          <select id="prop-filter-city">
            <option value="">Alle St&auml;dte</option>
          </select>
          <input type="number" id="prop-filter-rating"
            placeholder="Min. Rating (z.B. 4)" step="0.1" min="0" max="5">
          <button class="btn btn-primary" onclick="searchProperties()">Suchen</button>
          <button class="btn btn-secondary" onclick="clearPropertyFilter()">Zur&uuml;cksetzen</button>
        </div>
      </div>

      <div class="panel">
        <h2>Unterkunft anlegen / bearbeiten</h2>
        <form id="property-form" class="form-grid">
          <input type="hidden" id="prop-edit-id">
          <div class="form-row">
            <label for="prop-name">Name</label>
            <input type="text" id="prop-name" placeholder="Hotel Name">
          </div>
          <div class="form-row">
            <label for="prop-type">Typ</label>
            <input type="text" id="prop-type" placeholder="Hotel / Hostel / Apartment">
          </div>
          <div class="form-row">
            <label for="prop-price">Preis / Nacht (&euro;)</label>
            <input type="number" id="prop-price" placeholder="120" step="0.01" min="0">
          </div>
          <div class="form-row">
            <label for="prop-rating">Rating</label>
            <input type="number" id="prop-rating" placeholder="4.5" step="0.1" min="0" max="5">
          </div>
          <div class="form-row">
            <label for="prop-city">Stadt</label>
            <select id="prop-city">
              <option value="">&ndash; Stadt w&auml;hlen &ndash;</option>
            </select>
          </div>
          <div class="form-row">
            <label for="prop-category">Kategorie</label>
            <select id="prop-category">
              <option value="">&ndash; Kategorie w&auml;hlen &ndash;</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="prop-submit-btn">Erstellen</button>
            <button type="button" class="btn btn-secondary" id="prop-cancel-btn" style="display:none">Abbrechen</button>
          </div>
        </form>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2>Suchergebnisse</h2>
        </div>
        <div id="properties-query" class="query-area"></div>
        <div id="properties-table"></div>
      </div>
    </section>
  `
}

// ── Logik ────────────────────────────────────────────────────

let _propertiesCache = []

async function initProperties() {
  fillSelect(document.getElementById('prop-filter-category'), _categories, 'name', 'name', 'Alle Kategorien')
  fillSelect(document.getElementById('prop-filter-city'),     _cities,     'name', 'name', 'Alle Städte')
  fillSelect(document.getElementById('prop-city'),            _cities,     'name', 'name', '– Stadt wählen –')
  fillSelect(document.getElementById('prop-category'),        _categories, 'name', 'name', '– Kategorie wählen –')
  setupPropertyForm()
  await searchProperties()
}

async function searchProperties() {
  const params = {}
  const cat    = document.getElementById('prop-filter-category').value
  const city   = document.getElementById('prop-filter-city').value
  const rating = document.getElementById('prop-filter-rating').value
  if (cat)    params.category  = cat
  if (city)   params.city      = city
  if (rating) params.minRating = rating

  try {
    const result = await Api.getProperties(params)
    _propertiesCache = result.data
    showResult(
      result,
      document.getElementById('properties-query'),
      document.getElementById('properties-table'),
      row => `
        <button class="btn btn-xs btn-edit"
          onclick="editProperty('${escHtml(row.id)}')">Bearbeiten</button>
        <button class="btn btn-xs btn-delete"
          onclick="confirmDeleteProperty('${escHtml(row.id)}', '${escHtml(row.name)}')">L&ouml;schen</button>
      `
    )
  } catch (e) {
    toast('Fehler bei der Suche: ' + e.message, 'error')
  }
}

function clearPropertyFilter() {
  document.getElementById('prop-filter-category').value = ''
  document.getElementById('prop-filter-city').value     = ''
  document.getElementById('prop-filter-rating').value   = ''
  searchProperties()
}

function setupPropertyForm() {
  document.getElementById('property-form').onsubmit = async (e) => {
    e.preventDefault()
    const editId = document.getElementById('prop-edit-id').value
    const data = {
      id:            editId || nextId('P', _propertiesCache),
      name:          document.getElementById('prop-name').value.trim(),
      type:          document.getElementById('prop-type').value.trim(),
      pricePerNight: document.getElementById('prop-price').value,
      rating:        document.getElementById('prop-rating').value,
      cityName:      document.getElementById('prop-city').value,
      categoryName:  document.getElementById('prop-category').value,
    }
    try {
      if (editId) {
        await Api.updateProperty(editId, data)
        toast('Unterkunft erfolgreich aktualisiert')
      } else {
        if (!data.cityName) { toast('Bitte eine Stadt wählen', 'error'); return }
        await Api.createProperty(data)
        toast('Unterkunft erfolgreich angelegt')
      }
      resetPropertyForm()
      await searchProperties()
    } catch (e) {
      toast('Fehler: ' + e.message, 'error')
    }
  }
  document.getElementById('prop-cancel-btn').onclick = resetPropertyForm
}

function editProperty(id) {
  const prop = _propertiesCache.find(p => p.id === id)
  if (!prop) return
  document.getElementById('prop-edit-id').value    = id
  document.getElementById('prop-name').value       = prop.name      ?? ''
  document.getElementById('prop-type').value       = prop.type      ?? ''
  document.getElementById('prop-price').value      = prop.preis     ?? ''
  document.getElementById('prop-rating').value     = prop.rating    ?? ''
  document.getElementById('prop-city').value       = prop.stadt     ?? ''
  document.getElementById('prop-category').value   = prop.kategorie ?? ''
  document.getElementById('prop-submit-btn').textContent     = 'Speichern'
  document.getElementById('prop-cancel-btn').style.display   = 'inline-flex'
  document.getElementById('property-form').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function confirmDeleteProperty(id, name) {
  if (!confirm(`Unterkunft "${name}" (${id}) wirklich löschen?`)) return
  try {
    await Api.deleteProperty(id)
    toast('Unterkunft gelöscht')
    await searchProperties()
  } catch (e) {
    toast('Fehler beim Löschen: ' + e.message, 'error')
  }
}

function resetPropertyForm() {
  document.getElementById('property-form').reset()
  document.getElementById('prop-edit-id').value            = ''
  document.getElementById('prop-submit-btn').textContent   = 'Erstellen'
  document.getElementById('prop-cancel-btn').style.display = 'none'
}
