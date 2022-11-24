const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

const express = require('express')
const app = express()

app.set('view engine', 'ejs')

app.use(cookieParser())
app.use(express.static(__dirname + "/public"))
app.use(express.urlencoded({extended: true}))
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.redirect('/home')
})

app.get('/home', (req, res) => {
  let cookie = req.cookies.username
  if (cookie) {
    res.render("home", {username: cookie})
  } else {
    res.redirect('/account/login')
  }
})

/*
Just testing how to use cookies
app.get('/setcookie', (req, res) => {
  res.cookie(`username`, `Ravioli`, {
    maxAge: 5*60
  })
  res.send('Cookie saved successfully')
})

app.get('/getcookie', (req, res) => {
  let cookie = req.cookies.username
  res.send(cookie)
})
*/

const accountRouter = require('./routes/account')
app.use('/account', accountRouter)

app.get('/:err', (req, res) => {
  res.sendStatus(404)
})


app.listen(3000)
