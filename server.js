const cookieParser = require("cookie-parser")

const express = require('express')
const app = express()

app.set('view engine', 'ejs')

app.use(cookieParser())
app.use(express.static(__dirname + "/public"))

app.get('/', (req, res) => {
  res.redirect('/home')
})

app.get('/home', (req, res) => {
  cookie = req.cookie
  if (cookie) {
    res.render("/home")
  } else {
    res.redirect('/account/login')
  }
})

const accountRouter = require('./routes/account')
app.use('/account', accountRouter)

app.listen(3000)
