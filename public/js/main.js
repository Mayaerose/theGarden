// The garden page: plant, read, edit and delete flowers using fetch()

const garden = document.querySelector('#garden')
const palette = document.querySelector('#palette')
const overlay = document.querySelector('#overlay')
const modalBody = document.querySelector('#modalBody')
const hint = document.querySelector('#hint')
const emptyNote = document.querySelector('#emptyNote')

// flower type -> nice label, built from the buttons on the page
const labels = {}
document.querySelectorAll('.pick').forEach(btn => {
  labels[btn.dataset.type] = btn.dataset.label
})

// ---------- helpers ----------

// build text safely so nothing a user types can be treated as HTML
function el (tag, props = {}, ...children) {
  const node = document.createElement(tag)
  Object.assign(node, props)
  children.forEach(child => node.append(child))
  return node
}

function openModal (...content) {
  modalBody.replaceChildren(...content)
  overlay.hidden = false
}

function closeModal () {
  document.querySelectorAll('.pick').forEach(p => p.classList.remove('selected'))
  overlay.hidden = true
  modalBody.replaceChildren()
}

function sprite (type) {
  return el('img', { src: '/assets/flowers/' + type + '.svg', alt: '', className: 'preview' })
}

// dates are saved as midnight UTC, so show them in UTC too or they can slip a day
function prettyDate (iso) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}

// today as YYYY-MM-DD in the visitor's own timezone (the default in the date picker)
function today () {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate())
}

// is this text an email address? (otherwise we treat it as a phone number)
function isEmail (text) {
  return text.includes('@')
}

// a link that opens the person's own email or text app with a note already written
function sendLink (contact, fromName) {
  const note = fromName + ' planted a flower for you in The Garden. Come see it: ' + window.location.origin + '/garden'
  if (isEmail(contact)) {
    return 'mailto:' + contact + '?subject=' + encodeURIComponent('A flower for you') + '&body=' + encodeURIComponent(note)
  }
  return 'sms:' + contact.replace(/[^\d+]/g, '') + '?&body=' + encodeURIComponent(note)
}

// the popup shown after planting a flower that is dedicated to someone
function showSendPrompt (contact, fromName) {
  const how = isEmail(contact) ? 'an email' : 'a text'
  const send = el('a', { className: 'btn', href: sendLink(contact, fromName) }, 'Send ' + how)
  const done = el('button', { className: 'btn btn-plain', type: 'button' }, 'Not now')
  done.addEventListener('click', closeModal)
  openModal(
    el('h2', {}, 'Planted!'),
    el('p', { className: 'note' }, 'Want to let ' + contact + ' know? This opens your own ' + (isEmail(contact) ? 'email' : 'messages') + ' app with a note already written.'),
    el('div', { className: 'actions' }, send, done)
  )
}

// show a flower on the garden. Notice: no name, date or message is put on the page here.
function drawFlower (flower) {
  const btn = el('button', { className: 'flower', type: 'button' })
  btn.dataset.id = flower._id
  btn.setAttribute('aria-label', labels[flower.flowerType] || 'Flower')
  btn.append(el('img', { src: '/assets/flowers/' + flower.flowerType + '.svg', alt: '' }))
  btn.addEventListener('click', event => {
    event.stopPropagation()
    openFlower(flower._id)
  })
  garden.append(btn)
  emptyNote.hidden = true
}

// ---------- load the garden (READ ALL) ----------

async function loadGarden () {
  const res = await fetch('/api/flowers')
  if (res.status === 401) return (window.location = '/login')
  const flowers = await res.json()
  flowers.forEach(drawFlower)
  emptyNote.hidden = flowers.length > 0
}

// ---------- pick a flower, then plant it (CREATE) ----------
// No more choosing a spot: the garden is a grid and each new flower takes the next space.

palette.addEventListener('click', event => {
  const pick = event.target.closest('.pick')
  if (!pick) return
  document.querySelectorAll('.pick').forEach(p => p.classList.remove('selected'))
  pick.classList.add('selected')
  showPlantForm(pick.dataset.type)
})

function showPlantForm (type) {
  const name = el('input', { type: 'text', name: 'name', required: true, maxLength: 30, autocomplete: 'off' })
  const message = el('input', { type: 'text', name: 'message', required: true, maxLength: 100, autocomplete: 'off' })
  const date = el('input', { type: 'date', name: 'date', required: true, value: today() })
  const dedicatedTo = el('input', { type: 'text', name: 'dedicatedTo', maxLength: 100, autocomplete: 'off', placeholder: 'email or phone number' })
  const error = el('p', { className: 'error' })
  const form = el('form', {},
    el('label', {}, 'Your name', name),
    el('label', {}, 'A short message (one line)', message),
    el('label', {}, 'Date', date),
    el('label', {}, 'Dedicate it to someone (optional)', dedicatedTo),
    error,
    el('div', { className: 'actions' }, el('button', { className: 'btn', type: 'submit' }, 'Plant it'))
  )

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const res = await fetch('/api/flowers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowerType: type, name: name.value, message: message.value, date: date.value, dedicatedTo: dedicatedTo.value })
    })
    const data = await res.json()
    if (!res.ok) {
      error.textContent = data.error
      return
    }
    drawFlower(data)
    if (data.dedicatedTo) {
      showSendPrompt(data.dedicatedTo, name.value)
    } else {
      closeModal()
    }
    hint.textContent = 'Planted! Pick another flower, or click one to read its note.'
    document.querySelectorAll('.pick').forEach(p => p.classList.remove('selected'))
  })

  openModal(sprite(type), el('h2', {}, 'Plant a ' + labels[type]), form)
  name.focus()
}

// ---------- open a flower (READ ONE) ----------

async function openFlower (id) {
  const res = await fetch('/api/flowers/' + id)
  const flower = await res.json()
  if (!res.ok) return openModal(el('p', { className: 'error' }, flower.error))

  const buttons = el('div', { className: 'actions' })
  if (flower.canEdit) {
    const editBtn = el('button', { className: 'btn btn-alt', type: 'button' }, 'Edit')
    editBtn.addEventListener('click', () => showEditForm(flower))
    buttons.append(editBtn)
  }
  if (flower.canDelete) {
    const delBtn = el('button', { className: 'btn btn-danger', type: 'button' }, 'Remove')
    delBtn.addEventListener('click', () => removeFlower(flower._id))
    buttons.append(delBtn)
  }

  // everyone can see that it is dedicated, but only the person who planted it sees who to
  const dedication = flower.dedicated
    ? el('p', { className: 'date' }, flower.dedicatedTo ? 'Dedicated to ' + flower.dedicatedTo : 'Dedicated to someone special')
    : ''

  openModal(
    sprite(flower.flowerType),
    el('h2', {}, flower.name),
    el('p', { className: 'date' }, prettyDate(flower.date)),
    el('p', { className: 'note' }, '“' + flower.message + '”'),
    dedication,
    buttons
  )
}

// ---------- edit (UPDATE) ----------

function showEditForm (flower) {
  const name = el('input', { type: 'text', value: flower.name, required: true, maxLength: 30 })
  const message = el('input', { type: 'text', value: flower.message, required: true, maxLength: 100 })
  const date = el('input', { type: 'date', value: flower.date.slice(0, 10), required: true })
  const dedicatedTo = el('input', { type: 'text', value: flower.dedicatedTo || '', maxLength: 100, placeholder: 'email or phone number' })
  const error = el('p', { className: 'error' })
  const form = el('form', {},
    el('label', {}, 'Your name', name),
    el('label', {}, 'Message', message),
    el('label', {}, 'Date', date),
    el('label', {}, 'Dedicated to (optional)', dedicatedTo),
    error,
    el('div', { className: 'actions' }, el('button', { className: 'btn', type: 'submit' }, 'Save'))
  )

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const res = await fetch('/api/flowers/' + flower._id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.value, message: message.value, date: date.value, dedicatedTo: dedicatedTo.value })
    })
    const data = await res.json()
    if (!res.ok) {
      error.textContent = data.error
      return
    }
    openFlower(flower._id)
  })

  openModal(sprite(flower.flowerType), el('h2', {}, 'Edit your flower'), form)
}

// ---------- delete (DELETE) ----------

async function removeFlower (id) {
  if (!confirm('Remove this flower from the garden?')) return
  const res = await fetch('/api/flowers/' + id, { method: 'DELETE' })
  if (!res.ok) {
    const data = await res.json()
    return alert(data.error)
  }
  garden.querySelector('[data-id="' + id + '"]').remove()
  emptyNote.hidden = garden.querySelectorAll('.flower').length > 0
  closeModal()
}

// ---------- close the popup ----------

document.querySelector('#closeBtn').addEventListener('click', closeModal)
overlay.addEventListener('click', event => {
  if (event.target === overlay) closeModal()
})
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeModal()
})

loadGarden()
