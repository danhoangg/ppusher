const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

const express = require('express')
const app = express()

//using ejs to render pages to pass information to the page
app.set('view engine', 'ejs')

app.use(cookieParser())
app.use(express.static(__dirname + "/public"))
app.use(express.urlencoded({extended: true}))
app.use(bodyParser.urlencoded({ extended: true }))

app.get('/', (req, res) => {
  res.redirect('/home')
})

//checks if the user has a cookie of their username to check if they're logged inspect logged in
//if not logged in the redirect to login

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

//importing the account and home router
const homeRouter = require('./routes/home')
const accountRouter = require('./routes/account')
app.use('/home', homeRouter)
app.use('/account', accountRouter)


//if the user searchs something that doesn't exist on the site, send 404 status code
app.get('/:err', (req, res) => {
  res.sendStatus(404)
})

//listening on port 3000
app.listen(3000)
