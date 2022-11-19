const express = require('express')
const router = express.Router()

router.get('/login', (req, res) => {
  res.render("account/login")
})

router.get('/signup', (req, res) => {
  res.render('account/signup')
})

router.get('/', (req, res) => {
  res.redirect('/login')
})

module.exports = router
