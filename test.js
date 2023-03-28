const express = require('express');
const session = require('express-session');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

const app = express();

// Setup session middleware
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
}));

// Define your login route
app.get('/login', (req, res) => {
  // Render your login form here
  res.render('login');
});

// Handle login form submission
app.post('/login', (req, res) => {
  // Authenticate user here
  // ...
  
  // Redirect user back to the original URL or / if it's not provided
  const redirectTo = req.session.returnTo || '/';
  delete req.session.returnTo;
  res.redirect(redirectTo);
});

// Define your protected route
app.get('/profile', ensureLoggedIn('/login'), (req, res) => {
  // Render your profile page here
  res.render('profile', { user: req.user });
});

// Start the server
app.listen(3003);
