const express = require('express')
const passport = require('passport')

const app = express()

app.set('view engine', 'pug')

// 默认页
app.get('/', (req, res) => res.send('OAuth2.0 Server'))

// 登录页
app.get('/login', (req, res) => res.render('login'))
app.post('/login', (req, res) => passport.authenticate('local', { successReturnToOrRedirect: '/', failureRedirect: '/login' }))

app.listen(3001)