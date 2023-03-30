const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const LocalStrategy = require('passport-local').Strategy
const BasicStrategy = require('passport-http').BasicStrategy
const BearerStrategy = require('passport-http-bearer').Strategy
const session = require('express-session')
const MemoryStore = require('memorystore')(session)
const errorHandler = require('errorhandler')
const passport = require('passport')
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn
const oauth2orize = require('oauth2orize')
const uuid = require('uuid').v4

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
app.use(session({
  secret: 'keyboard cat', 
  store,
  resave: false, 
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())

// 2. passport setup: 
let users = [{ username: 'admin', password: 'password' }]

// serialization/deserialization: 
passport.serializeUser((user, done) => {
  done(null, user.username)
})
passport.deserializeUser((username, done) => { 
  done(null, users.filter(user => user.username == username)[0]) 
})

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

// basic strategy:
function verifyClient(clientId, clientSecret, done) {
  let client = clients.filter(client => client.id == clientId && client.secret == clientSecret)[0]
  if (!client) return done(null, false)
  return done(null, client)
}
passport.use(new BasicStrategy(verifyClient))

// bearer strategy
passport.use(new BearerStrategy(
  (accessToken, done) => {
    const token = accessTokens.filter(token => token.token == accessToken)[0]
    if (!token) return done(null, false)
    const user = users.filter(user => user.username == token.username)[0]
    if (!user) return done(null, false)
    // To keep this example simple, restricted scopes are not implemented,
    // and this is just for illustrative purposes.
    done(null, user, { scope: '*' })
  }
))


// 3. authorization server
// create server and init data: clients, tokens, auth codes, users
const oauth2server = oauth2orize.createServer()
const clients = [{ id: 'abc123', name: 'ToyApp', secret: 'secret'}]
const accessTokens = []
const refreshTokens = []
const authCodes = []

// client serialization and deserialization
oauth2server.serializeClient((client, done) => done(null, client.id))
oauth2server.deserializeClient((id, done) => {
  let client = clients.filter(client => client.id == id)[0]
  return done(null, client)
})

// grant type: authorization code
oauth2server.grant(oauth2orize.grant.code((client, redirectUri, user, ares, done) => {
  const code = uuid()
  authCodes.push({
    code, 
    clientId: client.id, 
    redirectUri,
    userId: user.id,
    username: user.username
  })
  return done(null, code)
}))

function issueTokens(username, clientId, done) {
  const user = users.filter(user => user.username == username)[0]
  const accessToken = uuid()
  const refreshToken = uuid()
  accessTokens.push({ token: accessToken, username, clientId })
  refreshTokens.push({ token: refreshToken, username, clientId })
  return done(null, accessToken, refreshToken, { username: user.name })
}

// exchange auth code for access tokens
oauth2server.exchange(oauth2orize.exchange.code((client, code, redirectUri, done) => {
  let authCode = authCodes.filter(authCode => authCode.code == code)[0]
  if (!authCode || client.id !== authCode.clientId) return done(null, false)
  if (redirectUri !== authCode.redirectUri) return done(null, false)
  issueTokens(authCode.username, client.clientId, done)
}))


// authorization handler
let authorize = oauth2server.authorization((clientId, redirectUri, done) => {
  let client = clients.filter(client => client.id == clientId)[0]
  // TODO: verifiy redirectUri
  return done(null, client, redirectUri);
}, (client, user, done) => {
  let token = accessTokens.filter(token => token.userId == user.id && token.clientId == client.clientId)[0]
  if (token) return done(null, true)
  // Otherwise ask user
  return done(null, false)
})

const authorization = [
  authorize,
  (req, res) => {
    res.render('dialog', 
      { transactionId: req.oauth2.transactionID,
        user: req.user,
        client: req.oauth2.client })
  }
]
// decision endpoint
const decision = [ensureLoggedIn(), oauth2server.decision()]
// logout endpoint
const logout = (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    return res.redirect('/')
  })
}
// token handler
const exchangeToken = [
  passport.authenticate(['basic', 'oauth2-client-password'], { session: false }),
  oauth2server.token(),
  oauth2server.errorHandler(),
]
// verify token
const verifyToken = [
  passport.authenticate('bearer', { session: false }),
  (req, res) => {
    // request.authInfo is set using the `info` argument supplied by
    // `BearerStrategy`. It is typically used to indicate scope of the token,
    // and used in access control checks. For illustrative purposes, this
    // example simply returns the scope in the response.
    res.json({ username: req.user.username, scope: req.authInfo.scope });
  }
]


// 4. routes
// authorization for the app itself
app.get('/', ensureLoggedIn(), (_, res) => res.send('<html><body>OAuth2 Server, <a href="/logout">Logout</a></body></html>'))
app.get('/login', (_, res) => res.render('login', { error: null })) // TODO: error flash message
app.post('/login', passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' }))
app.get('/logout', logout)
app.get('/account',  ensureLoggedIn(), (req, res) => res.send(`username: ${req.user.username}`))
// authorization for 3rd party app
// TODO: will not redirect back to /dialog/authorize after logging in, debug
app.get('/dialog/authorize', ensureLoggedIn(), authorization)
app.post('/dialog/authorize/decision', decision)
app.post('/oauth/token', exchangeToken)
// api
app.get('/api/userinfo', verifyToken)
// others
app.get('/sessions', (req, res) => store.all( (err, sessions) => res.json(sessions) ))

// 5. start server
const port = 3001
app.listen(port)
console.log(`OAuth2 server started on ${port}`)