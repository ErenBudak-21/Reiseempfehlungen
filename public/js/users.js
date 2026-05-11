// Nutzer-Tab: HTML-Template + CRUD für (:User)-Knoten

function getUsersTemplate() {
  return `
    <section id="tab-users" class="tab-section">
      <h1>Nutzer</h1>

      <div class="panel">
        <h2>Nutzer anlegen / bearbeiten</h2>
        <form id="user-form" class="form-grid">
          <input type="hidden" id="user-edit-id">
          <div class="form-row">
            <label for="user-name">Name</label>
            <input type="text" id="user-name" placeholder="Vorname Nachname" required>
          </div>
          <div class="form-row">
            <label for="user-email">E-Mail</label>
            <input type="email" id="user-email" placeholder="email@example.com">
          </div>
          <div class="form-row">
            <label for="user-age">Alter</label>
            <input type="number" id="user-age" placeholder="25" min="1" max="120">
          </div>
          <div class="form-row">
            <label for="user-praeferenz">Pr&auml;ferenz</label>
            <select id="user-praeferenz">
              <option value="">&ndash; keine &ndash;</option>
            </select>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary" id="user-submit-btn">Erstellen</button>
            <button type="button" class="btn btn-secondary" id="user-cancel-btn" style="display:none">Abbrechen</button>
          </div>
        </form>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2>Alle Nutzer</h2>
          <button class="btn btn-sm" onclick="loadUsers()">Aktualisieren</button>
        </div>
        <div id="users-query" class="query-area"></div>
        <div id="users-table"></div>
      </div>
    </section>
  `
}

// ── Logik ────────────────────────────────────────────────────

let _usersCache = []

async function initUsers() {
  fillSelect(
    document.getElementById('user-praeferenz'),
    _categories, 'name', 'name', '– keine –'
  )
  setupUserForm()
  await loadUsers()
}

async function loadUsers() {
  try {
    const result = await Api.getUsers()
    _usersCache = result.data
    showResult(
      result,
      document.getElementById('users-query'),
      document.getElementById('users-table'),
      row => `
        <button class="btn btn-xs btn-edit"
          onclick="editUser('${escHtml(row.id)}')">Bearbeiten</button>
        <button class="btn btn-xs btn-delete"
          onclick="confirmDeleteUser('${escHtml(row.id)}', '${escHtml(row.name)}')">L&ouml;schen</button>
      `
    )
  } catch (e) {
    toast('Nutzer konnten nicht geladen werden: ' + e.message, 'error')
  }
}

function setupUserForm() {
  document.getElementById('user-form').onsubmit = async (e) => {
    e.preventDefault()
    const editId = document.getElementById('user-edit-id').value
    const data = {
      id:         editId || nextId('U', _usersCache),
      name:       document.getElementById('user-name').value.trim(),
      email:      document.getElementById('user-email').value.trim(),
      age:        document.getElementById('user-age').value,
      praeferenz: document.getElementById('user-praeferenz').value,
    }
    try {
      if (editId) {
        await Api.updateUser(editId, data)
        toast('Nutzer erfolgreich aktualisiert')
      } else {
        await Api.createUser(data)
        toast('Nutzer erfolgreich angelegt')
      }
      resetUserForm()
      await loadUsers()
    } catch (e) {
      toast('Fehler: ' + e.message, 'error')
    }
  }
  document.getElementById('user-cancel-btn').onclick = resetUserForm
}

function editUser(id) {
  const user = _usersCache.find(u => u.id === id)
  if (!user) return
  document.getElementById('user-edit-id').value    = id
  document.getElementById('user-name').value       = user.name      ?? ''
  document.getElementById('user-email').value      = user.email     ?? ''
  document.getElementById('user-age').value        = user.age       ?? ''
  document.getElementById('user-praeferenz').value = user.praeferenz ?? ''
  document.getElementById('user-submit-btn').textContent      = 'Speichern'
  document.getElementById('user-cancel-btn').style.display    = 'inline-flex'
  document.getElementById('user-form').scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function confirmDeleteUser(id, name) {
  if (!confirm(`Nutzer "${name}" (${id}) wirklich löschen?\nAlle zugehörigen Buchungen werden ebenfalls entfernt.`)) return
  try {
    await Api.deleteUser(id)
    toast('Nutzer gelöscht')
    await loadUsers()
  } catch (e) {
    toast('Fehler beim Löschen: ' + e.message, 'error')
  }
}

function resetUserForm() {
  document.getElementById('user-form').reset()
  document.getElementById('user-edit-id').value            = ''
  document.getElementById('user-submit-btn').textContent   = 'Erstellen'
  document.getElementById('user-cancel-btn').style.display = 'none'
}
