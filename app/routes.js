const Flower = require('./models/flower')
const flowerList = require('../config/flowers')

module.exports = function (app, passport) {

// page routes =================================================================

  // welcome page: log in / sign up links
  app.get('/', (req, res) => {
    if (req.isAuthenticated()) return res.redirect('/garden')
    res.render('index.ejs')
  })

  // the garden itself (login required)
  app.get('/garden', isLoggedIn, (req, res) => {
    res.render('garden.ejs', { user: req.user, flowers: flowerList })
  })

  // LOGOUT
  app.post('/logout', (req, res, next) => {
    req.logout(err => {
      if (err) return next(err)
      res.redirect('/')
    })
  })

// login and signup ============================================================

  app.get('/login', (req, res) => {
    res.render('login.ejs', { message: req.flash('loginMessage') })
  })

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/garden',
    failureRedirect: '/login',
    failureFlash: true
  }))

  app.get('/signup', (req, res) => {
    res.render('signup.ejs', { message: req.flash('signupMessage') })
  })

  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/garden',
    failureRedirect: '/signup',
    failureFlash: true
  }))

// flower API ==================================================================
// Every route below checks login on the SERVER, so hiding buttons is never the only protection.

  // READ ALL: only what is needed to draw the garden, oldest first so the grid fills in order.
  // No name, date or message here.
  app.get('/api/flowers', isLoggedInAPI, async (req, res) => {
    try {
      const flowers = await Flower.find({}, 'flowerType').sort({ createdAt: 1 })
      res.json(flowers)
    } catch (err) {
      res.status(500).json({ error: 'Could not load the garden' })
    }
  })

  // READ ONE: the details, sent only when someone clicks a flower
  app.get('/api/flowers/:id', isLoggedInAPI, async (req, res) => {
    try {
      const flower = await Flower.findById(req.params.id)
      if (!flower) return res.status(404).json({ error: 'Flower not found' })
      res.json({
        _id: flower._id,
        flowerType: flower.flowerType,
        name: flower.name,
        message: flower.message,
        date: flower.date,
        // the email or phone number is private: only the person who planted it can see it
        dedicated: Boolean(flower.dedicatedTo),
        dedicatedTo: isOwner(flower, req.user) ? flower.dedicatedTo : undefined,
        canEdit: isOwner(flower, req.user),
        canDelete: isOwner(flower, req.user) || req.user.role === 'admin'
      })
    } catch (err) {
      res.status(400).json({ error: 'Bad flower id' })
    }
  })

  // CREATE: the owner comes from the server (the login session), not the browser
  app.post('/api/flowers', isLoggedInAPI, async (req, res) => {
    try {
      const flower = await Flower.create({
        flowerType: req.body.flowerType,
        name: req.body.name,
        message: req.body.message,
        date: req.body.date,
        dedicatedTo: req.body.dedicatedTo,
        owner: req.user._id
      })
      res.status(201).json({ _id: flower._id, flowerType: flower.flowerType, dedicatedTo: flower.dedicatedTo })
    } catch (err) {
      res.status(400).json({ error: friendlyError(err) })
    }
  })

  // UPDATE: owner only. Only name, message, date and dedication can change.
  app.patch('/api/flowers/:id', isLoggedInAPI, async (req, res) => {
    try {
      const flower = await Flower.findById(req.params.id)
      if (!flower) return res.status(404).json({ error: 'Flower not found' })
      if (!isOwner(flower, req.user)) return res.status(403).json({ error: 'Only the person who planted this can edit it' })
      if (req.body.name !== undefined) flower.name = req.body.name
      if (req.body.message !== undefined) flower.message = req.body.message
      if (req.body.date !== undefined) flower.date = req.body.date
      if (req.body.dedicatedTo !== undefined) flower.dedicatedTo = req.body.dedicatedTo
      await flower.save()
      res.json({ message: 'Flower updated' })
    } catch (err) {
      res.status(400).json({ error: friendlyError(err) })
    }
  })

  // DELETE: owner or admin
  app.delete('/api/flowers/:id', isLoggedInAPI, async (req, res) => {
    try {
      const flower = await Flower.findById(req.params.id)
      if (!flower) return res.status(404).json({ error: 'Flower not found' })
      if (!isOwner(flower, req.user) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You cannot remove this flower' })
      }
      await flower.deleteOne()
      res.json({ message: 'Flower removed' })
    } catch (err) {
      res.status(400).json({ error: 'Bad flower id' })
    }
  })
}

// helpers =====================================================================

function isOwner (flower, user) {
  return flower.owner.equals(user._id)
}

// route middleware for pages: send visitors to the welcome page
function isLoggedIn (req, res, next) {
  if (req.isAuthenticated()) return next()
  res.redirect('/')
}

// route middleware for the API: answer with a 401 instead of redirecting
function isLoggedInAPI (req, res, next) {
  if (req.isAuthenticated()) return next()
  res.status(401).json({ error: 'Please log in' })
}

// turn Mongoose validation errors into something a person can read
function friendlyError (err) {
  if (err.name === 'ValidationError') {
    return Object.values(err.errors).map(e => e.message).join(' ')
  }
  return 'Something went wrong'
}
