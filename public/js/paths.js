// Pfadabfragen-Tab: 2-Hop und 4er-Kette durch den Graphen

async function initPaths() {
  const sel = document.getElementById('path-user-select')
  try {
    const result = await Api.getUsers()
    fillSelect(sel, result.data, 'id', 'name', '– Nutzer wählen –')
  } catch (e) {
    sel.innerHTML = '<option value="">Fehler beim Laden</option>'
  }
}

async function runPaths() {
  const userId = document.getElementById('path-user-select').value
  if (!userId) {
    toast('Bitte einen Nutzer wählen', 'error')
    return
  }

  try {
    // Beide Pfadabfragen parallel ausführen
    const [res2, res4] = await Promise.all([
      Api.bookingsByUser(userId),
      Api.fullJourney(userId)
    ])

    showResult(res2, document.getElementById('path2-query'), document.getElementById('path2-table'))
    showResult(res4, document.getElementById('path4-query'), document.getElementById('path4-table'))
  } catch (e) {
    toast('Fehler bei Pfadabfrage: ' + e.message, 'error')
  }
}
