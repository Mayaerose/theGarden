// load the things we need
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// define the schema for our user model
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }, // this is the HASH, never the real password
  role: { type: String, enum: ['member', 'admin'], default: 'member' },
  createdAt: { type: Date, default: Date.now }
})

// generating a hash
userSchema.methods.generateHash = function (password) {
  return bcrypt.hashSync(password, 8)
}

// checking if password is valid
userSchema.methods.validPassword = function (password) {
  return bcrypt.compareSync(password, this.password)
}

module.exports = mongoose.model('User', userSchema)
