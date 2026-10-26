// server.js

// set up ======================================================================
require('dotenv').config() // loads MONGO_URI and SESSION_SECRET from the .env file
const express = require('express')
const app = express()
const port = process.env.PORT || 8080
const mongoose = require('mongoose')
const passport = require('passport')
const flash = require('connect-flash')
const session = require('express-session')
const { MongoStore } = require('connect-mongo')

if (!process.env.MONGO_URI || !process.env.SESSION_SECRET) {
  console.log('Missing MONGO_URI or SESSION_SECRET. Fill in your .env file (see .env.example).')
  process.exit(1)
}

require('./config/passport')(passport) // pass passport for configuration

// set up our express application
app.use(express.json()) // read JSON sent by fetch()
app.use(express.urlencoded({ extended: true })) // read html forms
app.use(express.static('public'))
app.set('view engine', 'ejs')

// required for passport
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  // sessions are saved in MongoDB so logins survive a server restart
  store: MongoStore.create({ mongoUrl: process.env.MONGO_URI })
}))
app.use(passport.initialize())
app.use(passport.session()) // persistent login sessions
app.use(flash())

// routes ======================================================================
require('./app/routes.js')(app, passport)

// launch ======================================================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB')
    app.listen(port, () => console.log('The garden is growing on http://localhost:' + port))
  })
  .catch(err => {
    console.log('Could not connect to MongoDB:', err.message)
    process.exit(1)
  })
