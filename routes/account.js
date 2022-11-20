const express = require('express')
const bodyParser = require('body-parser')

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password",
  database: "sys"
});

const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())

router.get('/login', (req, res) => {
  res.render("account/login")
})

router.get('/signup', (req, res) => {
  res.render('account/signup')
})

router.post('/signup', (req, res) => {
  body = req.body

  sql = "SELECT EXISTS(SELECT * FROM UserTable WHERE ...)"
  con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("sql successfully executed");
    });
  });
})

router.get('/', (req, res) => {
  res.redirect('/account/login')
})

module.exports = router
