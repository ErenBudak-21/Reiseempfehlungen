// Nutzer-Tab: CRUD für (:User)-Knoten

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
        <button class="btn btn-xs btn-edit" onclick="editUser('${escHtml(row.id)}')">Bearbeiten</button>
        <button class="btn btn-xs btn-delete" onclick="confirmDeleteUser('${escHtml(row.id)}', '${escHtml(row.name)}')">L&ouml;schen</button>
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

  document.getElementById('user-edit-id').value      = id
  document.getElementById('user-name').value         = user.name      ?? ''
  document.getElementById('user-email').value        = user.email     ?? ''
  document.getElementById('user-age').value          = user.age       ?? ''
  document.getElementById('user-praeferenz').value   = user.praeferenz ?? ''

  document.getElementById('user-submit-btn').textContent = 'Speichern'
  document.getElementById('user-cancel-btn').style.display = 'inline-flex'
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
