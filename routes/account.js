const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const crypto = require('crypto')

var dbconnection = require('./config.js').mysql_pool;

//Making a router for the account section to keep the main server.js look clean
//Will also make a router for the home page sections

//Important, all functions involving mysql must use callback functions so bc of asynchronous programming
//Checks if the user exists in the database
function checkIfUserExists(username, callback) {
  dbconnection.getConnection(function (err, con) {
    con.query("SELECT COUNT(*) FROM UserTable WHERE username = ?", username, function (err, result, fields) {
      if (err) throw err;
      callback(null, result[0]['COUNT(*)'])
    });
    con.release();
  })
}

// Inserts the user into the sql database
function insertUserTable(username, password, email, callback) {
  dbconnection.getConnection(function (err, con) {
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
    con.release();
  })
}

//Then inserts the users starting balance into the transaction table
function insertTransactionTable(startingBal, userid) {
  var sql = "INSERT INTO TransactionTable (UserID, Transaction, Balance) VALUES ('" + userid + "', '" + startingBal + "', '" + startingBal + "')"
  dbconnection.getConnection(function (err, con) {
    con.query(sql, function (err, result) {
      if (err) throw err;
      console.log("record successfully inserted into TransactionTable");
    });
    con.release()
  });
}

//This then checks if the users password entered matches the users password in database
function checkPassword(username, password, callback) {
  var sql = "SELECT Password FROM UserTable WHERE username = '" + username + "'"
  dbconnection.getConnection(function (err, con) {
    con.query(sql, function (err, result) {
      if (err) throw err;
      callback(null, result[0].Password);
    })
    con.release();
  })
}

const router = express.Router()

//in order to render responses
router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())
router.use(cookieParser())

router.get('/login', (req, res) => {
  res.render("account/login")
})

router.get('/signup', (req, res) => {
  res.render('account/signup')
})

//signup post request to make account
router.post('/signup', (req, res) => {
  body = req.body
  hashedPassword = crypto.createHash('md5').update(body.password).digest('hex')

  checkIfUserExists(body.username, function (err, userExists) {
    if (err) throw err
    if (userExists > 0) {
      res.sendStatus(400)
    } else {
      insertUserTable(body.username, hashedPassword, body.email, function (err, userid) {
        insertTransactionTable(body.startingBal, userid)
      })
      res.redirect('/account/login')
    }
  })
})

//login post request to check if information matches database and if it does then create a cookie of the users username
router.post('/login', (req, res) => {
  body = req.body
  hashedPassword = crypto.createHash('md5').update(body.password).digest('hex')

  checkIfUserExists(body.username, function (err, userExists) {
    if (userExists > 0) {
      checkPassword(body.username, hashedPassword, function (err, password) {
        if (password == hashedPassword) {
          res.cookie(`username`, body.username, {
            maxAge: 86400000
          })
          res.redirect('/home')
        } else {
          res.sendStatus(400)
        }
      })
    } else {
      res.sendStatus(400)
    }
  })
})

//redirect to useful page as this one doesn't lead anywhere
router.get('/', (req, res) => {
  res.redirect('/account/login')
})

//export the router to use in server.js
module.exports = router
