const mongoose = require('mongoose')
const flowers = require('../../config/flowers')

// simple checks: something@something.something, or 7 to 15 digits (+, spaces, dashes and ( ) allowed)
function isEmail (v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
}
function isPhone (v) {
  return /^\+?\d{7,15}$/.test(v.replace(/[\s\-().]/g, ''))
}

const flowerSchema = new mongoose.Schema({
  // must be one of the eight types in config/flowers.js
  flowerType: {
    type: String,
    required: true,
    enum: flowers.map(f => f.type)
  },
  // the name the planter types in
  name: { type: String, required: true, trim: true, maxlength: 30 },
  // one short line only: line breaks get swapped for spaces
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
    set: v => (typeof v === 'string' ? v.replace(/[\r\n]+/g, ' ') : v)
  },
  // the date the planter picks (a date with no time, stored as midnight UTC)
  date: { type: Date, required: [true, 'Please choose a date.'] },
  // optional: the email or phone number of someone this flower is dedicated to.
  // An empty box is saved as "nothing" so the field is left out.
  dedicatedTo: {
    type: String,
    trim: true,
    maxlength: 100,
    set: v => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    validate: {
      validator: v => !v || isEmail(v) || isPhone(v),
      message: 'Please enter a valid email address or phone number, or leave it blank.'
    }
  },
  // who planted it. The SERVER sets this from the login session, never the browser
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true }) // adds createdAt (when it was saved, used for grid order) and updatedAt

module.exports = mongoose.model('Flower', flowerSchema)
