const express = require('express')
const bodyParser = require('body-parser')

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "sql7.freemysqlhosting.net",
  port: "3306",
  user: "sql7579297",
  password: "NkWyBFmxXc",
  database: "sql7579297"
});

con.connect(function(err) {});

function checkIfUserExists(username) {
  con.query("SELECT * FROM UserTable WHERE username = ?", username, function (err, result, fields) {
    if (err) throw err;
    if (result.length > 0) {
      return true;
    } else {
      return false;
    }
  });
}

function insertUserTable(username, password, email) {
  var sql = "INSERT INTO UserTable (Username, Password, Email) VALUES ('" + username + "', '" + password + "', '" + email + "')"
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("record successfully inserted into UserTable");
  });
  sql = "SELECT UserID FROM UserTable WHERE username = '" + username + "'"
  con.query(sql, function (err, result) {
    if (err) throw err;
    return result[0].UserID;
  });
}

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

  if (checkIfUserExists(body.username)) {
    res.render('account/signup', {error: "Username already exists"})
  } else {
    var userid = insertUserTable(body.username, body.password, body.email)
  }
})

router.get('/', (req, res) => {
  res.redirect('/account/login')
})

module.exports = router
