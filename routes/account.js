const express = require('express')
const bodyParser = require('body-parser')
const crypto = require('crypto')

var mysql = require('mysql');

var con = mysql.createConnection({
  host: "sql7.freemysqlhosting.net",
  port: "3306",
  user: "sql7579297",
  password: "",
  database: "sql7579297"
});

con.connect(function(err) {});

function checkIfUserExists(username, callback) {
  con.query("SELECT COUNT(*) FROM UserTable WHERE username = ?", username, function (err, result, fields) {
    if (err) throw callback(err);
    callback(null, result[0]['COUNT(*)'])
  });
}

function insertUserTable(username, password, email, callback) {
  var sql = "INSERT INTO UserTable (Username, Password, Email) VALUES ('" + username + "', '" + password + "', '" + email + "')"
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("record successfully inserted into UserTable");
  });
  sql = "SELECT UserID FROM UserTable WHERE username = '" + username + "'"
  con.query(sql, function (err, result) {
    if (err) throw err;
    callback(null, result[0].UserID);
  });
}

function insertTransactionTable(startingBal, userid) {
  var sql = "INSERT INTO TransactionTable (UserID, Transaction, Balance) VALUES ('" + userid + "', '" + startingBal + "', '" + startingBal + "')"
  con.query(sql, function (err, result) {
    if (err) throw err;
    console.log("record successfully inserted into TransactionTable");
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
  body.password = crypto.createHash('md5').update(body.password).digest('hex')

  checkIfUserExists(body.username, function(err, userExists) {
    if (userExists > 0) {
      res.render('account/signup', {error: "Username already exists"})
    } else {
      insertUserTable(body.username, body.password, body.email, function(err, userid) {
        insertTransactionTable(body.startingBal, userid)
      })
      res.redirect('/account/login')
    }
  })
})

router.get('/', (req, res) => {
  res.redirect('/account/login')
})

module.exports = router
