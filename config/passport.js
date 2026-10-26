// load all the things we need
const LocalStrategy = require('passport-local').Strategy
const User = require('../app/models/user')

module.exports = function (passport) {

  // used to serialize the user for the session
  passport.serializeUser((user, done) => done(null, user.id))

  // used to deserialize the user
  passport.deserializeUser(async (id, done) => {
    try {
      done(null, await User.findById(id))
    } catch (err) {
      done(err)
    }
  })

  // LOCAL SIGNUP ============================================================
  passport.use('local-signup', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, async (req, email, password, done) => {
    try {
      if (password.length < 6) {
        return done(null, false, req.flash('signupMessage', 'Password must be at least 6 characters.'))
      }
      const existing = await User.findOne({ email: email.toLowerCase().trim() })
      if (existing) {
        return done(null, false, req.flash('signupMessage', 'That email is already taken.'))
      }
      const newUser = new User()
      newUser.email = email
      newUser.password = newUser.generateHash(password)
      // role is NOT read from the form. It stays "member" no matter what is sent
      await newUser.save()
      return done(null, newUser)
    } catch (err) {
      return done(err)
    }
  }))

  // LOCAL LOGIN =============================================================
  passport.use('local-login', new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password',
    passReqToCallback: true
  }, async (req, email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase().trim() })
      if (!user) {
        return done(null, false, req.flash('loginMessage', 'No user found.'))
      }
      if (!user.validPassword(password)) {
        return done(null, false, req.flash('loginMessage', 'Oops! Wrong password.'))
      }
      return done(null, user)
    } catch (err) {
      return done(err)
    }
  }))
}
