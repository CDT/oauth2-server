const express = require('express');
const session = require('express-session');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn;

const app = express();
app.set('view engine', 'ejs')

// Configure session middleware
app.use(session({
  secret: 'my-secret',
  resave: false,
  saveUninitialized: false,
}));

// Define a middleware function that sets a user object on the session
app.use((req, res, next) => {
  req.session.user = {
    id: 123,
    username: 'johndoe',
    email: 'johndoe@example.com',
  };
  req.isAuthenticated = () => true
  next();
});

// Define a route that requires authentication
app.get('/dashboard', ensureLoggedIn('/login'), (req, res) => {
  // Only authenticated users can access this route
  res.send(`Welcome to your dashboard, ${req.session.user.username}!`);
});

// Define a login route that sets the user object on the session
app.post('/login', (req, res) => {
  req.session.user = {
    id: 123,
    username: 'johndoe',
    email: 'johndoe@example.com',
  };
  req.isAuthenticated = () => true
  res.redirect('/dashboard');
});

app.get('/login', (req, res) => res.render('login', {error: null}))

// Start the server
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});
