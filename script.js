/* ============================================================
   PetriLog — A Digital Culture Observation Tracker
   Main Application Script

   Handles:
     1.  Adding culture records
     2.  Saving records in localStorage
     3.  Displaying saved culture records
     4.  Adding observations
     5.  Calculating elapsed time between dates
     6.  Displaying uploaded image previews
     7.  Building the observation timeline
     8.  Updating dashboard statistics
     9.  Generating colony growth graphs (Chart.js)
     10. Calculating simple observation insights
     11. Searching and filtering cultures
     12. Deleting cultures and observations
   ============================================================ */

import './style.css'

// ---- SECTION 1 — State ----

const STORAGE_KEY = 'petrilog_cultures'

const navLinks         = document.querySelectorAll('[data-nav]')
const navLinksContainer = document.getElementById('navLinks')
const navToggle        = document.getElementById('navToggle')
const mainContent      = document.getElementById('mainContent')
const confirmModal     = document.getElementById('confirmModal')
const confirmMessage   = document.getElementById('confirmMessage')
const confirmOk        = document.getElementById('confirmOk')
const confirmCancel    = document.getElementById('confirmCancel')
const toastEl          = document.getElementById('toast')

let cultures       = []
let currentView    = 'dashboard'
let currentCultureId = null
let pendingImage   = null
let growthChart    = null

// ---- SECTION 2 — Utilities ----

function loadCultures() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) {
    try { cultures = JSON.parse(raw) } catch { cultures = [] }
  }
  if (!cultures || cultures.length === 0) seedSampleData()
}

function saveCultures() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cultures))
}

function generateId() {
  return 'CULT-' + Date.now().toString(36).toUpperCase().slice(-4)
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

function getElapsedTime(startDate, endDate) {
  const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime()
  if (diffMs < 0) return { label: '0 hours', hours: 0 }
  const totalMinutes = Math.floor(diffMs / 60000)
  const days         = Math.floor(totalMinutes / 1440)
  const hours        = Math.floor((totalMinutes % 1440) / 60)
  const totalHours   = Math.floor(diffMs / 3600000)
  let label
  if (days > 0 && hours > 0) label = `${days}d ${hours}h`
  else if (days > 0)          label = `${days}d`
  else if (totalHours > 0)    label = `${totalHours}h`
  else                         label = `${totalMinutes}m`
  return { label, hours: totalHours }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function showToast(message, type = 'info') {
  toastEl.textContent = message
  toastEl.className   = 'toast show ' + type
  setTimeout(() => { toastEl.className = 'toast' }, 2800)
}

function confirmAction(message) {
  return new Promise((resolve) => {
    confirmMessage.textContent = message
    confirmModal.classList.add('show')
    const onOk     = () => { cleanup(); resolve(true)  }
    const onCancel = () => { cleanup(); resolve(false) }
    function cleanup() {
      confirmModal.classList.remove('show')
      confirmOk.removeEventListener('click', onOk)
      confirmCancel.removeEventListener('click', onCancel)
    }
    confirmOk.addEventListener('click', onOk)
    confirmCancel.addEventListener('click', onCancel)
  })
}

function esc(str) {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function getCultureStatus(culture) {
  if (culture.status === 'completed') return 'completed'
  const obs = culture.observations || []
  if (obs.length > 0) {
    const diffDays = (new Date() - new Date(obs[obs.length - 1].datetime)) / 86400000
    if (diffDays > 7) return 'completed'
  }
  return 'active'
}

// ---- SECTION 3 — Sample Data ----

function seedSampleData() {
  const now = new Date()
  const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString()

  cultures = [
    {
      id: 'CULT-001', sampleName: 'Sample A — Soil Bacteria',
      medium: 'Nutrient Agar', dateStarted: daysAgo(3),
      notes: 'Soil sample collected from garden area near the campus greenhouse. Incubated at 37°C.',
      status: 'active', image: null,
      observations: [
        { id: 'obs-001', datetime: daysAgo(3), colonyCount: 0,  appearance: 'Circular',  color: 'White', shape: 'Round',    texture: 'Smooth', notes: 'Initial inoculation. No visible colonies yet.', image: null },
        { id: 'obs-002', datetime: daysAgo(2), colonyCount: 12, appearance: 'Circular',  color: 'Cream', shape: 'Round',    texture: 'Smooth', notes: 'Small circular colonies visible. Uniform distribution across the plate.', image: null },
        { id: 'obs-003', datetime: daysAgo(1), colonyCount: 28, appearance: 'Circular',  color: 'Cream', shape: 'Round',    texture: 'Smooth', notes: 'Colony count increased significantly. Edges remain smooth and circular.', image: null },
      ],
    },
    {
      id: 'CULT-002', sampleName: 'Sample B — Pond Water',
      medium: 'MacConkey Agar', dateStarted: daysAgo(5),
      notes: 'Pond water sample collected from the campus pond. Plated on MacConkey agar for gram-negative selection.',
      status: 'active', image: null,
      observations: [
        { id: 'obs-004', datetime: daysAgo(5), colonyCount: 0,  appearance: 'Circular',  color: 'White',  shape: 'Round',    texture: 'Smooth', notes: 'Initial plating. No colonies visible.', image: null },
        { id: 'obs-005', datetime: daysAgo(4), colonyCount: 8,  appearance: 'Irregular', color: 'Yellow', shape: 'Spreading', texture: 'Mucoid', notes: 'Pink colonies indicating lactose fermenters. Some irregular spreading patterns.', image: null },
        { id: 'obs-006', datetime: daysAgo(2), colonyCount: 35, appearance: 'Irregular', color: 'Yellow', shape: 'Spreading', texture: 'Mucoid', notes: 'Significant growth. Colonies spreading across the plate surface.', image: null },
      ],
    },
    {
      id: 'CULT-003', sampleName: 'Sample C — Yogurt Culture',
      medium: 'Blood Agar', dateStarted: daysAgo(10),
      notes: 'Yogurt sample plated to observe Lactobacillus colonies. Completed observation cycle.',
      status: 'completed', image: null,
      observations: [
        { id: 'obs-007', datetime: daysAgo(10), colonyCount: 0,  appearance: 'Circular', color: 'White', shape: 'Round', texture: 'Smooth', notes: 'Initial plating.', image: null },
        { id: 'obs-008', datetime: daysAgo(8),  colonyCount: 15, appearance: 'Circular', color: 'White', shape: 'Round', texture: 'Rough',  notes: 'Small white colonies appearing.', image: null },
        { id: 'obs-009', datetime: daysAgo(5),  colonyCount: 47, appearance: 'Mixed',    color: 'Cream', shape: 'Round', texture: 'Rough',  notes: 'Highest colony count recorded. Observation cycle complete.', image: null },
      ],
    },
  ]
  saveCultures()
}

// ---- SECTION 4 — Navigation ----

function navigateTo(view, cultureId = null) {
  currentView      = view
  currentCultureId = cultureId
  pendingImage     = null
  navLinks.forEach(l => l.classList.toggle('active', l.dataset.nav === view))
  navLinksContainer.classList.remove('open')
  window.scrollTo({ top: 0, behavior: 'smooth' })
  render()
}

navLinks.forEach(link => link.addEventListener('click', e => {
  e.preventDefault()
  navigateTo(link.dataset.nav)
}))

navToggle.addEventListener('click', () => navLinksContainer.classList.toggle('open'))

// ---- SECTION 5 — Render Dispatcher ----

function render() {
  switch (currentView) {
    case 'home':           renderHome(); break
    case 'dashboard':      renderDashboard(); break
    case 'addCulture':     renderAddCulture(); break
    case 'observations':   renderObservations(); break
    case 'cultureDetails': renderCultureDetails(currentCultureId); break
    case 'about':          renderAbout(); break
    default:               renderDashboard()
  }
}

// ---- SECTION 6 — Home View ----

function renderHome() {
  const totalCultures = cultures.length
  const totalObs = cultures.reduce((s, c) => s + (c.observations?.length || 0), 0)

  mainContent.innerHTML = `
    <div class="view">
      <section class="hero">
        <div class="hero-content">
          <h1>🧫 PetriLog</h1>
          <p class="hero-subtitle">Your Digital Culture Observation Tracker</p>
          <p class="hero-desc">Document, organize, and track microbiology culture observations over time.</p>
          <button class="btn btn-primary btn-lg" id="heroCreateBtn">+ Create New Culture</button>
        </div>
      </section>

      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">🧫</div><div class="stat-value">${totalCultures}</div><div class="stat-label">Total Cultures</div></div>
        <div class="stat-card"><div class="stat-icon">🔬</div><div class="stat-value">${totalObs}</div><div class="stat-label">Total Observations</div></div>
        <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-value">${cultures.filter(c => getCultureStatus(c) === 'active').length}</div><div class="stat-label">Active Cultures</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${cultures.filter(c => getCultureStatus(c) === 'completed').length}</div><div class="stat-label">Completed Cultures</div></div>
      </div>

      <div class="section-header"><h2>🚀 Quick Actions</h2></div>
      <div class="culture-grid">
        <div class="card hoverable" style="cursor:pointer" id="quickAdd">
          <div class="stat-icon">➕</div>
          <h3 style="margin-top:12px">Add New Culture</h3>
          <p>Create a new culture record with an initial image and notes.</p>
        </div>
        <div class="card hoverable" style="cursor:pointer" id="quickDashboard">
          <div class="stat-icon">📊</div>
          <h3 style="margin-top:12px">View Dashboard</h3>
          <p>See all your culture records and observation statistics.</p>
        </div>
        <div class="card hoverable" style="cursor:pointer" id="quickObs">
          <div class="stat-icon">📝</div>
          <h3 style="margin-top:12px">All Observations</h3>
          <p>Browse observations across all your culture records.</p>
        </div>
      </div>
    </div>
  `

  document.getElementById('heroCreateBtn')?.addEventListener('click', () => navigateTo('addCulture'))
  document.getElementById('quickAdd')?.addEventListener('click', () => navigateTo('addCulture'))
  document.getElementById('quickDashboard')?.addEventListener('click', () => navigateTo('dashboard'))
  document.getElementById('quickObs')?.addEventListener('click', () => navigateTo('observations'))
}

// ---- SECTION 7 — Dashboard ----

function renderDashboard() {
  const totalCultures  = cultures.length
  const totalObs       = cultures.reduce((s, c) => s + (c.observations?.length || 0), 0)
  const activeCount    = cultures.filter(c => getCultureStatus(c) === 'active').length
  const completedCount = totalCultures - activeCount
  const recent         = [...cultures].sort((a, b) => new Date(b.dateStarted) - new Date(a.dateStarted)).slice(0, 6)

  mainContent.innerHTML = `
    <div class="view">
      <div class="section-header">
        <h2>📊 Dashboard</h2>
        <button class="btn btn-primary" id="dashAddBtn">+ Create New Culture</button>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon">🧫</div><div class="stat-value">${totalCultures}</div><div class="stat-label">Total Cultures</div></div>
        <div class="stat-card"><div class="stat-icon">🔬</div><div class="stat-value">${totalObs}</div><div class="stat-label">Total Observations</div></div>
        <div class="stat-card"><div class="stat-icon">⏱️</div><div class="stat-value">${activeCount}</div><div class="stat-label">Active Cultures</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${completedCount}</div><div class="stat-label">Completed Cultures</div></div>
      </div>
      <div class="section-header"><h2>🧫 Recent Cultures</h2></div>
      ${renderCultureGrid(recent)}
    </div>
  `

  document.getElementById('dashAddBtn')?.addEventListener('click', () => navigateTo('addCulture'))
  attachCultureCardEvents()
}

function renderCultureGrid(cultureList) {
  if (cultureList.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">🧫</div>
        <h3>No culture records yet</h3>
        <p>Create your first culture to begin tracking observations.</p>
        <button class="btn btn-primary" onclick="window.__petrilogNav('addCulture')">+ Create New Culture</button>
      </div>`
  }
  return `
    <div class="culture-grid">
      ${cultureList.map(c => {
        const status  = getCultureStatus(c)
        const lastObs = c.observations?.length > 0 ? c.observations[c.observations.length - 1].datetime : null
        return `
          <div class="culture-card" data-culture-id="${esc(c.id)}">
            <div class="culture-card-header">
              <span class="culture-card-id">${esc(c.id)}</span>
              <span class="badge badge-${status}"><span class="badge-dot"></span>${status === 'active' ? 'Active' : 'Completed'}</span>
            </div>
            <div class="culture-card-body">
              <h3>${esc(c.sampleName)}</h3>
              <div class="culture-meta">
                <div class="culture-meta-row"><span class="culture-meta-label">Medium</span><span class="culture-meta-value">${esc(c.medium)}</span></div>
                <div class="culture-meta-row"><span class="culture-meta-label">Started</span><span class="culture-meta-value">${formatDateShort(c.dateStarted)}</span></div>
                <div class="culture-meta-row"><span class="culture-meta-label">Last Obs.</span><span class="culture-meta-value">${lastObs ? formatDateShort(lastObs) : '—'}</span></div>
                <div class="culture-meta-row"><span class="culture-meta-label">Observations</span><span class="culture-meta-value">${c.observations?.length || 0}</span></div>
              </div>
            </div>
            <div class="culture-card-footer">
              <button class="btn btn-primary btn-sm view-btn" data-id="${esc(c.id)}">View Details</button>
              <button class="btn btn-danger btn-sm delete-culture-btn" data-id="${esc(c.id)}">Delete</button>
            </div>
          </div>`
      }).join('')}
    </div>`
}

function attachCultureCardEvents() {
  document.querySelectorAll('.view-btn').forEach(btn =>
    btn.addEventListener('click', () => navigateTo('cultureDetails', btn.dataset.id))
  )
  document.querySelectorAll('.delete-culture-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id
      if (await confirmAction(`Delete culture ${id} and all its observations? This cannot be undone.`)) {
        cultures = cultures.filter(c => c.id !== id)
        saveCultures()
        showToast('Culture deleted', 'success')
        render()
      }
    })
  )
}

// ---- SECTION 8 — Add Culture Form ----

function renderAddCulture() {
  mainContent.innerHTML = `
    <div class="view">
      <div class="section-header"><h2>🧫 Add New Culture</h2></div>
      <div class="card form-card">
        <form id="cultureForm">
          <div class="form-row">
            <div class="form-group">
              <label>Culture ID <span class="req">*</span></label>
              <input type="text" id="cf_id" placeholder="CULT-001" required />
              <p class="form-hint">A unique identifier for this culture.</p>
            </div>
            <div class="form-group">
              <label>Sample Name <span class="req">*</span></label>
              <input type="text" id="cf_sample" placeholder="Sample A" required />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Date &amp; Time Started <span class="req">*</span></label>
              <input type="datetime-local" id="cf_date" required />
            </div>
            <div class="form-group">
              <label>Medium <span class="req">*</span></label>
              <select id="cf_medium" required>
                <option value="">Select medium…</option>
                <option value="Nutrient Agar">Nutrient Agar</option>
                <option value="Blood Agar">Blood Agar</option>
                <option value="MacConkey Agar">MacConkey Agar</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Notes</label>
            <textarea id="cf_notes" placeholder="Describe the sample source, collection method, incubation conditions, etc."></textarea>
          </div>
          <div class="form-group">
            <label>Upload Initial Culture Image</label>
            <div class="upload-area" id="cf_uploadArea">
              <div class="upload-icon">📸</div>
              <div class="upload-text">Click to upload an image (optional)</div>
            </div>
            <input type="file" id="cf_image" accept="image/*" style="display:none" />
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">Save Culture</button>
            <button type="button" class="btn btn-secondary" id="cf_clear">Clear Form</button>
          </div>
        </form>
      </div>
    </div>`

  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  document.getElementById('cf_date').value = now.toISOString().slice(0, 16)
  document.getElementById('cf_id').value   = generateId()

  const uploadArea = document.getElementById('cf_uploadArea')
  const fileInput  = document.getElementById('cf_image')

  uploadArea.addEventListener('click', () => fileInput.click())
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0]
    if (file) {
      pendingImage = await fileToBase64(file)
      renderUploadPreview(uploadArea, pendingImage, () => {
        pendingImage = null
        fileInput.value = ''
        renderUploadArea(uploadArea)
      })
    }
  })

  document.getElementById('cultureForm').addEventListener('submit', e => {
    e.preventDefault()
    saveNewCulture()
  })

  document.getElementById('cf_clear').addEventListener('click', () => {
    document.getElementById('cultureForm').reset()
    pendingImage = null
    renderUploadArea(uploadArea)
    document.getElementById('cf_id').value = generateId()
    const n = new Date()
    n.setMinutes(n.getMinutes() - n.getTimezoneOffset())
    document.getElementById('cf_date').value = n.toISOString().slice(0, 16)
  })
}

function renderUploadArea(el) {
  el.className = 'upload-area'
  el.innerHTML = `<div class="upload-icon">📸</div><div class="upload-text">Click to upload an image (optional)</div>`
}

function renderUploadPreview(el, base64, onRemove) {
  el.className = 'upload-area has-preview'
  el.innerHTML = `
    <div class="image-preview">
      <img src="${base64}" alt="Preview" />
      <button type="button" class="remove-preview" title="Remove image">&times;</button>
    </div>`
  el.querySelector('.remove-preview').addEventListener('click', e => {
    e.stopPropagation()
    onRemove()
  })
}

function saveNewCulture() {
  const id          = document.getElementById('cf_id').value.trim()
  const sampleName  = document.getElementById('cf_sample').value.trim()
  const dateStarted = document.getElementById('cf_date').value
  const medium      = document.getElementById('cf_medium').value
  const notes       = document.getElementById('cf_notes').value.trim()

  if (!id || !sampleName || !dateStarted || !medium) {
    showToast('Please fill in all required fields', 'error')
    return
  }
  if (cultures.some(c => c.id === id)) {
    showToast('A culture with this ID already exists', 'error')
    return
  }

  cultures.push({
    id, sampleName, medium,
    dateStarted: new Date(dateStarted).toISOString(),
    notes, status: 'active', image: pendingImage,
    observations: pendingImage ? [{
      id: 'obs-' + Date.now(),
      datetime: new Date(dateStarted).toISOString(),
      colonyCount: 0, appearance: 'Initial', color: '—', shape: '—', texture: '—',
      notes: 'Initial culture image and record.', image: pendingImage,
    }] : [],
  })

  saveCultures()
  showToast('Culture saved successfully!', 'success')
  navigateTo('dashboard')
}

// ---- SECTION 9 — Culture Details ----

function renderCultureDetails(cultureId) {
  const culture = cultures.find(c => c.id === cultureId)
  if (!culture) {
    mainContent.innerHTML = `
      <div class="view empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>Culture not found</h3>
        <p>This culture record may have been deleted.</p>
        <button class="btn btn-primary" id="backDash">Back to Dashboard</button>
      </div>`
    document.getElementById('backDash')?.addEventListener('click', () => navigateTo('dashboard'))
    return
  }

  const status       = getCultureStatus(culture)
  const observations = culture.observations || []
  const latestDate   = observations.length > 0 ? observations[observations.length - 1].datetime : culture.dateStarted
  const elapsed      = getElapsedTime(culture.dateStarted, new Date().toISOString())

  mainContent.innerHTML = `
    <div class="view">
      <div class="detail-header">
        <div>
          <span class="back-link" id="backBtn">← Back to Dashboard</span>
          <h2 style="margin-top:8px">🧫 ${esc(culture.id)} — ${esc(culture.sampleName)}</h2>
        </div>
        <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
          <span class="badge badge-${status}"><span class="badge-dot"></span>${status === 'active' ? 'Active' : 'Completed'}</span>
          <button class="btn btn-ghost btn-sm" id="toggleStatusBtn">${status === 'active' ? 'Mark Completed' : 'Mark Active'}</button>
          <button class="btn btn-danger btn-sm" id="deleteCultureDetailBtn">Delete Culture</button>
        </div>
      </div>

      <div class="elapsed-card">
        <h3>⏱️ Elapsed Time</h3>
        <div class="elapsed-time" id="elapsedDisplay">${elapsed.label}</div>
        <div class="elapsed-sub">
          Started: ${formatDate(culture.dateStarted)}<br/>
          Current time: <span id="currentTimeDisplay">${formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      <div class="detail-info-grid">
        <div class="detail-info-item"><div class="detail-info-label">Culture ID</div><div class="detail-info-value">${esc(culture.id)}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Sample Name</div><div class="detail-info-value">${esc(culture.sampleName)}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Medium</div><div class="detail-info-value">${esc(culture.medium)}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Date Started</div><div class="detail-info-value">${formatDate(culture.dateStarted)}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Current Status</div><div class="detail-info-value">${status === 'active' ? 'Active' : 'Completed'}</div></div>
        <div class="detail-info-item"><div class="detail-info-label">Latest Observation</div><div class="detail-info-value">${latestDate !== culture.dateStarted ? formatDate(latestDate) : 'No observations yet'}</div></div>
      </div>

      ${culture.notes ? `<div class="card" style="margin-bottom:24px"><div class="detail-info-label" style="margin-bottom:8px">Notes</div><div style="color:var(--text)">${esc(culture.notes)}</div></div>` : ''}

      <div class="section-header"><h3>📝 Add Observation</h3></div>
      <div class="card" style="margin-bottom:24px">${renderObservationForm()}</div>

      ${observations.length > 1 ? `
        <div class="section-header"><h3>📊 Colony Growth Graph</h3></div>
        <div class="card graph-card"><div class="graph-container"><canvas id="growthChart"></canvas></div></div>
      ` : ''}

      ${observations.length > 0 ? renderInsights(culture) : ''}

      ${observations.filter(o => o.image).length > 0 ? `
        <div class="section-header"><h3>📸 Image Comparison</h3></div>
        <div class="card comparison-section">
          <div class="comparison-grid">
            ${observations.map(o => {
              const el = getElapsedTime(culture.dateStarted, o.datetime)
              return `
                <div class="comparison-item">
                  ${o.image ? `<img src="${o.image}" alt="Obs ${el.label}" />` : `<div class="no-img">🧫</div>`}
                  <div class="comparison-label">${el.label}</div>
                </div>`
            }).join('')}
          </div>
        </div>
      ` : ''}

      <div class="section-header"><h3>📋 Observation Timeline</h3></div>
      ${renderTimeline(culture)}
    </div>`

  document.getElementById('backBtn')?.addEventListener('click', () => navigateTo('dashboard'))

  document.getElementById('toggleStatusBtn')?.addEventListener('click', () => {
    culture.status = status === 'active' ? 'completed' : 'active'
    saveCultures()
    showToast('Status updated', 'success')
    render()
  })

  document.getElementById('deleteCultureDetailBtn')?.addEventListener('click', async () => {
    if (await confirmAction(`Delete culture ${culture.id} and all its observations? This cannot be undone.`)) {
      cultures = cultures.filter(c => c.id !== culture.id)
      saveCultures()
      showToast('Culture deleted', 'success')
      navigateTo('dashboard')
    }
  })

  attachObservationFormEvents(culture)
  attachObservationDeleteEvents(culture)
  if (observations.length > 1) setTimeout(() => renderGrowthChart(culture), 100)
  startElapsedTimeUpdater(culture)
}

let elapsedTimerId = null
function startElapsedTimeUpdater(culture) {
  if (elapsedTimerId) clearInterval(elapsedTimerId)
  elapsedTimerId = setInterval(() => {
    const elDisplay = document.getElementById('elapsedDisplay')
    const ctDisplay = document.getElementById('currentTimeDisplay')
    if (!elDisplay || !ctDisplay) { clearInterval(elapsedTimerId); return }
    elDisplay.textContent = getElapsedTime(culture.dateStarted, new Date().toISOString()).label
    ctDisplay.textContent = formatDate(new Date().toISOString())
  }, 1000)
}

// ---- SECTION 10 — Observation Form ----

function renderObservationForm() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  const defaultDT = now.toISOString().slice(0, 16)
  return `
    <form id="obsForm">
      <div class="form-row">
        <div class="form-group">
          <label>Observation Date &amp; Time <span class="req">*</span></label>
          <input type="datetime-local" id="of_datetime" value="${defaultDT}" required />
        </div>
        <div class="form-group">
          <label>Approximate Colony Count</label>
          <input type="text" id="of_count" placeholder="e.g. 12" inputmode="numeric" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Appearance</label>
          <select id="of_appearance">
            <option value="Circular">Circular</option>
            <option value="Irregular">Irregular</option>
            <option value="Mixed">Mixed</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div class="form-group">
          <label>Color</label>
          <select id="of_color">
            <option value="White">White</option>
            <option value="Cream">Cream</option>
            <option value="Yellow">Yellow</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Shape</label>
          <input type="text" id="of_shape" placeholder="e.g. Round, Spreading" />
        </div>
        <div class="form-group">
          <label>Texture</label>
          <input type="text" id="of_texture" placeholder="e.g. Smooth, Rough, Mucoid" />
        </div>
      </div>
      <div class="form-group">
        <label>Additional Notes</label>
        <textarea id="of_notes" placeholder="Describe any changes since the last observation..."></textarea>
      </div>
      <div class="form-group">
        <label>Upload Observation Image</label>
        <div class="upload-area" id="of_uploadArea">
          <div class="upload-icon">📸</div>
          <div class="upload-text">Click to upload an image (optional)</div>
        </div>
        <input type="file" id="of_image" accept="image/*" style="display:none" />
      </div>
      <div class="form-actions">
        <button type="submit" class="btn btn-accent">Add Observation</button>
      </div>
    </form>`
}

let obsPendingImage = null

function attachObservationFormEvents(culture) {
  obsPendingImage = null
  const uploadArea = document.getElementById('of_uploadArea')
  const fileInput  = document.getElementById('of_image')

  uploadArea?.addEventListener('click', () => fileInput.click())
  fileInput?.addEventListener('change', async () => {
    const file = fileInput.files[0]
    if (file) {
      obsPendingImage = await fileToBase64(file)
      renderUploadPreview(uploadArea, obsPendingImage, () => {
        obsPendingImage = null
        fileInput.value = ''
        renderUploadArea(uploadArea)
      })
    }
  })

  document.getElementById('obsForm')?.addEventListener('submit', e => {
    e.preventDefault()
    addObservation(culture)
  })
}

function addObservation(culture) {
  const datetime   = document.getElementById('of_datetime').value
  const count      = document.getElementById('of_count').value.trim()
  const appearance = document.getElementById('of_appearance').value
  const color      = document.getElementById('of_color').value
  const shape      = document.getElementById('of_shape').value.trim()
  const texture    = document.getElementById('of_texture').value.trim()
  const notes      = document.getElementById('of_notes').value.trim()

  if (!datetime) { showToast('Please enter the observation date and time', 'error'); return }

  culture.observations = culture.observations || []
  culture.observations.push({
    id: 'obs-' + Date.now(),
    datetime: new Date(datetime).toISOString(),
    colonyCount: count ? parseInt(count, 10) || 0 : 0,
    appearance, color,
    shape: shape || '—', texture: texture || '—',
    notes, image: obsPendingImage,
  })
  culture.observations.sort((a, b) => new Date(a.datetime) - new Date(b.datetime))
  saveCultures()
  showToast('Observation added!', 'success')
  render()
}

// ---- SECTION 11 — Timeline ----

function renderTimeline(culture) {
  const observations = culture.observations || []
  if (observations.length === 0) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">📝</div>
        <h3>No observations yet</h3>
        <p>Add your first observation using the form above.</p>
      </div>`
  }
  return `
    <div class="timeline">
      ${observations.map((o, i) => {
        const el      = getElapsedTime(culture.dateStarted, o.datetime)
        const isStart = i === 0
        return `
          <div class="timeline-item">
            <div class="timeline-dot ${isStart ? 'start' : ''}">${isStart ? '🧫' : '🔬'}</div>
            <div class="timeline-card">
              <div class="timeline-card-header">
                <div class="timeline-card-title">${isStart ? 'START' : 'OBSERVATION ' + i}</div>
                <span class="timeline-elapsed">${el.label}</span>
              </div>
              <div class="timeline-card-body">
                ${o.image ? `<img src="${o.image}" alt="Obs ${el.label}" class="timeline-img" />` : `<div class="timeline-no-img">🧫</div>`}
                <div class="timeline-info">
                  <div class="timeline-info-row"><span class="timeline-info-label">Date</span><span class="timeline-info-value">${formatDate(o.datetime)}</span></div>
                  <div class="timeline-info-row"><span class="timeline-info-label">Colony Count</span><span class="timeline-info-value">${o.colonyCount}</span></div>
                  <div class="timeline-info-row"><span class="timeline-info-label">Appearance</span><span class="timeline-info-value">${esc(o.appearance)}</span></div>
                  <div class="timeline-info-row"><span class="timeline-info-label">Color</span><span class="timeline-info-value">${esc(o.color)}</span></div>
                  <div class="timeline-info-row"><span class="timeline-info-label">Shape</span><span class="timeline-info-value">${esc(o.shape)}</span></div>
                  <div class="timeline-info-row"><span class="timeline-info-label">Texture</span><span class="timeline-info-value">${esc(o.texture)}</span></div>
                  ${o.notes ? `<div class="timeline-notes">${esc(o.notes)}</div>` : ''}
                </div>
              </div>
              ${!isStart ? `<button class="btn btn-ghost btn-sm delete-obs-btn" data-obs-id="${esc(o.id)}" style="margin-top:12px">🗑️ Delete Observation</button>` : ''}
            </div>
          </div>`
      }).join('')}
    </div>`
}

function attachObservationDeleteEvents(culture) {
  document.querySelectorAll('.delete-obs-btn').forEach(btn =>
    btn.addEventListener('click', async () => {
      const obsId = btn.dataset.obsId
      if (await confirmAction('Delete this observation? This cannot be undone.')) {
        culture.observations = culture.observations.filter(o => o.id !== obsId)
        saveCultures()
        showToast('Observation deleted', 'success')
        render()
      }
    })
  )
}

// ---- SECTION 12 — Growth Graph (Chart.js) ----

function renderGrowthChart(culture) {
  const canvas = document.getElementById('growthChart')
  if (!canvas || typeof Chart === 'undefined') return

  const observations = culture.observations || []
  const labels = observations.map(o => getElapsedTime(culture.dateStarted, o.datetime).label)
  const data   = observations.map(o => o.colonyCount)

  if (growthChart) growthChart.destroy()

  growthChart = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Colony Count',
        data,
        borderColor: '#0B5563',
        backgroundColor: 'rgba(26, 142, 146, 0.12)',
        borderWidth: 2,
        fill: true,
        tension: 0.35,
        pointBackgroundColor: '#1A8E92',
        pointBorderColor: '#FFFFFF',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { family: 'Inter, sans-serif', size: 13 }, color: '#1A2A35' } },
        tooltip: { backgroundColor: '#0E1B2A', titleFont: { family: 'Inter, sans-serif' }, bodyFont: { family: 'Inter, sans-serif' }, padding: 12, cornerRadius: 8 },
      },
      scales: {
        x: {
          title: { display: true, text: 'Elapsed Time', font: { family: 'Inter, sans-serif', size: 12, weight: '600' }, color: '#5A6A73' },
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { color: '#5A6A73', font: { family: 'Inter, sans-serif' } },
        },
        y: {
          title: { display: true, text: 'Approximate Colony Count', font: { family: 'Inter, sans-serif', size: 12, weight: '600' }, color: '#5A6A73' },
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { color: '#5A6A73', font: { family: 'Inter, sans-serif' } },
        },
      },
    },
  })
}

// ---- SECTION 13 — Insights ----

function renderInsights(culture) {
  const observations = culture.observations || []
  if (observations.length === 0) return ''

  const insights = []

  if (observations.length >= 2) {
    const diff = observations[observations.length - 1].colonyCount - observations[observations.length - 2].colonyCount
    if (diff > 0)      insights.push({ icon: '📈', text: `Colony count increased by ${diff} since the previous observation.` })
    else if (diff < 0) insights.push({ icon: '📉', text: `Colony count decreased by ${Math.abs(diff)} since the previous observation.` })
    else               insights.push({ icon: '➡️', text: 'Colony count remained the same since the previous observation.' })
  }

  const maxObs = observations.reduce((m, o) => o.colonyCount > m.colonyCount ? o : m, observations[0])
  insights.push({ icon: '🏆', text: `Highest recorded colony count: ${maxObs.colonyCount}.` })

  const latestObs = observations[observations.length - 1]
  insights.push({ icon: '⏱️', text: `Latest observation was recorded after ${getElapsedTime(culture.dateStarted, latestObs.datetime).label}.` })
  insights.push({ icon: '📝', text: `Total observations recorded: ${observations.length}.` })

  const avg = observations.reduce((s, o) => s + o.colonyCount, 0) / observations.length
  insights.push({ icon: '📊', text: `Average colony count across all observations: ${avg.toFixed(1)}.` })

  return `
    <div class="section-header"><h3>💡 Observation Insights</h3></div>
    <div class="insights-grid">
      ${insights.map(ins => `
        <div class="insight-card">
          <div class="insight-icon">${ins.icon}</div>
          <div class="insight-text">${esc(ins.text)}</div>
        </div>`).join('')}
    </div>`
}

// ---- SECTION 14 — All Observations View ----

function renderObservations() {
  const allObs = []
  cultures.forEach(c => (c.observations || []).forEach(o =>
    allObs.push({ ...o, cultureId: c.id, sampleName: c.sampleName, cultureStarted: c.dateStarted })
  ))
  allObs.sort((a, b) => new Date(b.datetime) - new Date(a.datetime))

  mainContent.innerHTML = `
    <div class="view">
      <div class="section-header"><h2>📝 All Observations</h2></div>
      ${allObs.length === 0 ? `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <h3>No observations yet</h3>
          <p>Observations will appear here once you add them to a culture.</p>
        </div>
      ` : `
        <div class="culture-grid">
          ${allObs.map(o => {
            const el = getElapsedTime(o.cultureStarted, o.datetime)
            return `
              <div class="culture-card">
                <div class="culture-card-header">
                  <span class="culture-card-id">${esc(o.cultureId)}</span>
                  <span class="timeline-elapsed">${el.label}</span>
                </div>
                <div class="culture-card-body">
                  <h3>${esc(o.sampleName)}</h3>
                  <div class="culture-meta">
                    <div class="culture-meta-row"><span class="culture-meta-label">Date</span><span class="culture-meta-value">${formatDateShort(o.datetime)}</span></div>
                    <div class="culture-meta-row"><span class="culture-meta-label">Colony Count</span><span class="culture-meta-value">${o.colonyCount}</span></div>
                    <div class="culture-meta-row"><span class="culture-meta-label">Appearance</span><span class="culture-meta-value">${esc(o.appearance)}</span></div>
                    <div class="culture-meta-row"><span class="culture-meta-label">Color</span><span class="culture-meta-value">${esc(o.color)}</span></div>
                  </div>
                </div>
                <div class="culture-card-footer">
                  <button class="btn btn-primary btn-sm view-obs-btn" data-id="${esc(o.cultureId)}">View Culture</button>
                </div>
              </div>`
          }).join('')}
        </div>`}
    </div>`

  document.querySelectorAll('.view-obs-btn').forEach(btn =>
    btn.addEventListener('click', () => navigateTo('cultureDetails', btn.dataset.id))
  )
}

// ---- SECTION 15 — About View ----

function renderAbout() {
  mainContent.innerHTML = `
    <div class="view">
      <div class="section-header"><h2>ℹ️ About PetriLog</h2></div>
      <div class="card about-card">
        <p style="font-size:1.05rem;margin-bottom:16px">
          <strong>PetriLog</strong> is a digital documentation and observation system designed for
          microbiology students. It helps you create culture records, add observations over time,
          upload and display culture images, track elapsed time, compare observations, and view
          a simple colony growth graph.
        </p>
        <p>
          All data is stored locally in your browser using <code>localStorage</code> — no account,
          server, or internet connection is required. Your records remain available even after
          refreshing the page.
        </p>
        <div class="about-features">
          <div class="about-feature"><div class="about-feature-icon">🧫</div><div><h4>Culture Records</h4><p>Create and manage culture records with sample details and initial images.</p></div></div>
          <div class="about-feature"><div class="about-feature-icon">📝</div><div><h4>Observation Timeline</h4><p>Document observations over time with images, colony counts, and notes.</p></div></div>
          <div class="about-feature"><div class="about-feature-icon">📊</div><div><h4>Growth Graph</h4><p>Visualize colony growth with an interactive line chart that updates automatically.</p></div></div>
          <div class="about-feature"><div class="about-feature-icon">⏱️</div><div><h4>Elapsed Time Tracker</h4><p>Track how much time has passed since the culture was started.</p></div></div>
          <div class="about-feature"><div class="about-feature-icon">📸</div><div><h4>Image Comparison</h4><p>Compare observation images side-by-side to see how cultures change over time.</p></div></div>
          <div class="about-feature"><div class="about-feature-icon">💡</div><div><h4>Smart Insights</h4><p>Get simple, automatically generated insights from your observation data.</p></div></div>
        </div>
        <div class="card" style="background:var(--warning-light);border:1px solid var(--warning);margin-top:24px">
          <p style="color:var(--navy);font-weight:500">
            ⚠️ <strong>Disclaimer:</strong> PetriLog is a student observation and documentation tool.
            It does not provide automated microorganism identification. All recorded characteristics
            are student-entered observations.
          </p>
        </div>
      </div>
    </div>`
}

// ---- SECTION 16 — Init ----

window.__petrilogNav = navigateTo
loadCultures()
navigateTo('home')

