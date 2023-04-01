const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')
const MemoryStore = require('memorystore')(session)
const errorHandler = require('errorhandler')
const passport = require('passport')
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn
const oauth2orize = require('oauth2orize')

// 1. Express configuration
const app = express()
// app.engine('ejs', ejs.__express)
app.set('view engine', 'ejs')
// app.set('views', path.join(__dirname, './views'))
app.use(cookieParser())
app.use(bodyParser.json({ extended: false }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(errorHandler())
const store = new MemoryStore({
  checkPeriod: 86400000 // prune expired entries every 24h
})

app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false, store }))
app.use(passport.initialize())
app.use(passport.session())

let users = [{ username: 'admin', password: 'password' }]
passport.serializeUser((user, done) =>  done(null, user.username))

passport.deserializeUser((username, done) => {
  let user = users.filter(user => user.username == username)[0]
  if (!user) return done(new Error('no user found'), user)
  done(null, user)
})

passport.use('local', new LocalStrategy(
  { passReqToCallback: true },
  (req, username, password, done) => {
    let user = users.filter(user => user.username == username && user.password == password)[0]
    // console.log(req.body.redirect)
    if (!user) {
      return done(null, false)
    }
    // req.redirect = req.body.redirect
    return done(null, user)
  }
))
const oauth2server = oauth2orize.createServer()

app.get('/sessions', (req, res) => store.all( (err, sessions) => res.json(sessions) ))
app.get('/login', (req, res) => res.render('login', { error: null, redirect: req.session.returnTo  }))
app.post('/login', passport.authenticate('local', 
  { 
    // successReturnToOrRedirect: '/',  // NOTE this will note work in passportJS 0.6.x!
    failureRedirect: '/login',
   }
), (req, res) => { // fix redirect
  if (req.body.redirect) {
    return res.redirect(req.body.redirect);
  } else {
    return res.redirect('/');
  }
})
app.get('/account', ensureLoggedIn(),  (req, res) => {
  res.send(req.sessionID + ': ' + JSON.stringify(req.user) + ', <a href="/logout">logout</a>')
})
app.get('/logout',  (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    return res.redirect('/')
  })
})
app.get('/', (req, res) => res.send('hello'))

const port = 3001
app.listen(port)
console.log(`server started on ${port}`)