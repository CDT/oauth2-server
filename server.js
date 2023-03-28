const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const LocalStrategy = require('passport-local').Strategy
const errorHandler = require('errorhandler')
const session = require('express-session')
const passport = require('passport')
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn
const oauth2server  =require('oauth2orize').createServer()

// 1. Express configuration
const app = express()
// app.engine('ejs', ejs.__express)
app.set('view engine', 'ejs')
// app.set('views', path.join(__dirname, './views'))
app.use(cookieParser())
app.use(bodyParser.json({ extended: false }))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(errorHandler())
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

// 2. passport setup: 
let users = [{ username: 'admin', password: 'password' }]

// serialization/deserialization: 
passport.serializeUser((user, done) =>  done(null, user.username))
passport.deserializeUser((username, done) => { done(null, users.filter(user => user.username == username)[0]) })

// local strategy:
passport.use(new LocalStrategy(
  (username, password, done) => {
    let user = users.filter(user => user.username == username && user.password == password)[0]

    if (!user) {
      return done(null, false)
    }
    return done(null, user)
  }
))

// 3. authorization server
let clients = [{ client_id: 'app1'}]
oauth2server.serializeClient((client, done) => done(null, client.id))
oauth2server.deserializeClient((id, done) => {
  let client = clients.filter(client => client.id = id)[0]
  return done(null, client)
})


// 4. routes
// authorization for the app itself
app.get('/', (_, res) => res.send('OAuth2 Server'))
app.get('/login', (_, res) => res.render('login', { error: null })) // TODO: error flash message
app.post('/login', passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' }))
app.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    return res.redirect('/')
  })
})
// authorization for 3rd party app
app.get('/dialog/authorize', ensureLoggedIn(), (_, res) => {res.send('logged in')})

const port = 3001
app.listen(port)
console.log(`OAuth2 server started on ${port}`)