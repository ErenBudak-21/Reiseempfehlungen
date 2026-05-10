// Unterkünfte-Tab: CRUD + gefilterte Suche für (:Property)-Knoten

let _propertiesCache = []

async function initProperties() {
  fillSelect(document.getElementById('prop-filter-category'), _categories, 'name', 'name', 'Alle Kategorien')
  fillSelect(document.getElementById('prop-filter-city'),     _cities,      'name', 'name', 'Alle Städte')
  fillSelect(document.getElementById('prop-city'),            _cities,      'name', 'name', '– Stadt wählen –')
  fillSelect(document.getElementById('prop-category'),        _categories,  'name', 'name', '– Kategorie wählen –')

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
        <button class="btn btn-xs btn-edit" onclick="editProperty('${escHtml(row.id)}')">Bearbeiten</button>
        <button class="btn btn-xs btn-delete" onclick="confirmDeleteProperty('${escHtml(row.id)}', '${escHtml(row.name)}')">L&ouml;schen</button>
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

  document.getElementById('prop-edit-id').value      = id
  document.getElementById('prop-name').value         = prop.name     ?? ''
  document.getElementById('prop-type').value         = prop.type     ?? ''
  document.getElementById('prop-price').value        = prop.preis    ?? ''
  document.getElementById('prop-rating').value       = prop.rating   ?? ''
  document.getElementById('prop-city').value         = prop.stadt    ?? ''
  document.getElementById('prop-category').value     = prop.kategorie ?? ''

  document.getElementById('prop-submit-btn').textContent        = 'Speichern'
  document.getElementById('prop-cancel-btn').style.display      = 'inline-flex'
  document.getElementById('property-form').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function confirmDeleteProperty(id, name) {
  if (!confirm(`Unterkunft "${name}" (${id}) wirklich löschen?\nAlle zugehörigen Buchungen werden ebenfalls entfernt.`)) return
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
