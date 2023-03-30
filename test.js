const express = require('express');
const session = require('express-session')

const MemoryStore = require('memorystore')(session)
const app = express()

const store = new MemoryStore({
  checkPeriod: 86400000 // prune expired entries every 24h
})

app.use(session({
  store,
  resave: false,
  secret: 'keyboard cat'
}))

app.get('/sessions', (req, res) => {
  store.all((err, o) => {
    res.json(o)
  })
})

app.listen(3000, () => console.log('Server started on port 3000'));
