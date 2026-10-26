// Run once from the terminal to make YOUR account an admin:
//   node scripts/makeAdmin.js you@example.com
// There is no route for this, so nobody can promote themselves from the website.
require('dotenv').config()
const mongoose = require('mongoose')
const User = require('../app/models/user')

async function run () {
  const email = (process.argv[2] || '').toLowerCase().trim()
  if (!email) return console.log('Usage: node scripts/makeAdmin.js you@example.com')
  await mongoose.connect(process.env.MONGO_URI)
  const user = await User.findOneAndUpdate({ email }, { role: 'admin' })
  console.log(user ? email + ' is now an admin' : 'No account found for ' + email)
  await mongoose.disconnect()
}
run()
