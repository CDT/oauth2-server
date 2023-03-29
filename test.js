const express = require('express');
const session = require('express-session');
const passport = require('passport');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn
const LocalStrategy = require('passport-local').Strategy;

const app = express();

app.set('view engine', 'ejs')

// Setup session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Define your local strategy
passport.use(new LocalStrategy(
  (username, password, done) => {
    // Authenticate user here
    // ...
    if (username != 'admin' && password != 'password') return
    // Return user object if authentication succeeds
    return done(null, {username: 'admin', password: 'password'});
  }
));

// Serialize and deserialize user objects
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  // Retrieve user object from database using id
  // ...

  // Return user object if found
  done(null, user);
});

// Define your login route
app.get('/login', (req, res) => {
  // Render your login form here
  res.render('login', {error: null});
});

// Handle login form submission
app.post('/login', passport.authenticate('local', {
  successReturnToOrRedirect: '/',
  failureRedirect: '/login',
}));

// Define your protected route
app.get('/', ensureLoggedIn(), (req, res) => {
  // Render your homepage here
  res.send('hello');
});

// Start the server
app.listen(3003, () => console.log('Server started on port 3003'));
