const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const crypto = require('crypto')

var dbconnection = require('./config.js').mysql_pool;
var transporter = require('./config.js').transporter;

var reinitialiseWebsocket = require('./orders.js').reinitialiseWebsocket

//Making a router for the account section to keep the main server.js look clean
//Will also make a router for the home page sections

//Important, all functions involving mysql must use callback functions so bc of asynchronous programming
//Checks if the user exists in the database
function checkIfUserExists(username, callback) {
  dbconnection.getConnection(function (err, con) {
    con.query("SELECT COUNT(*) FROM UserTable WHERE username = ?", username, function (err, result) {
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
function checkPassword(username, callback) {
  var sql = "SELECT Password FROM UserTable WHERE username = '" + username + "'"
  dbconnection.getConnection(function (err, con) {
    con.query(sql, function (err, result) {
      if (err) throw err;
      callback(null, result[0].Password);
    })
    con.release();
  })
}

function getEmail(username, callback) { //will need to use this function a lot with new mailing system
  dbconnection.getConnection(function (err, con) {
    con.query("SELECT Email FROM UserTable WHERE username = ?", [username], function (err, result) {
      if (err) throw err;
      callback(null, result[0].Email);
    })
    con.release();
  })
}

function sendEmail(output, subject, email) {
  // setup email data with unicode symbols
  let mailOptions = {
    from: '"PPusher Contact" ppusherwebsite@gmail.com', // sender address
    to: email, // list of receivers
    subject: subject, // Subject line
    html: output // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.log(error);
    }
  });
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

        let output = `
        <h1>Thank you for signing up to PPusher</h1>
        <p>Here is your starting balance: ${body.startingBal}</p>
        <p>Here is your username: ${body.username}</p>
        `;
        let subject = 'New Signup';
        sendEmail(output, subject, body.email);
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
      checkPassword(body.username, function (err, password) {
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

//everything below is for the settings section of the account page
function updatePassword(username, password) { //this function updates the password in the database
  dbconnection.getConnection(function (err, con) {
    con.query("UPDATE UserTable SET Password = ? WHERE Username = ?", [password, username], function (err) {
      if (err) throw err;
      console.log("Password successfully updated");

      getEmail(username, function (err, email) { //notify user of update to password
        if (err) throw err
        let output = `<h1>Hi ${username}, your password has just been updated.</h1>
         <h2>If you did not do this please contact us at ppusherwebsite@gmail.com</h2>
         `;
        let subject = 'Password Updated';
        sendEmail(output, subject, email);
      })
    })
    con.release();
  })
}

function getInitialBalance(username, callback) { //get the initial balance of the user
  dbconnection.getConnection(function (err, con) {
    con.query("SELECT Balance FROM TransactionTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?) ORDER BY Date ASC LIMIT 1", [username], function (err, results) {
      if (err) throw err;
      callback(null, results[0].Balance)
    })
    con.release();
  })
}

function resetUser(username, startingbal) { //get the initial balance of the user
  dbconnection.getConnection(function (err, con) {
    con.query("DELETE FROM OrderTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?); DELETE FROM TransactionTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?); INSERT INTO TransactionTable (UserID, Transaction, Balance) VALUES ((SELECT UserID FROM UserTable WHERE username = ?), ?, ?)", [username, username, username, startingbal, startingbal], function (err) {
      if (err) throw err;
      console.log("User successfully reset")

      getEmail(username, function (err, email) { //notify user of reset account
        if (err) throw err
        let output = `<h1>Hi ${username}, Your account has been reset.</h1>
         <h2>If you did not do this please contact us at ppusherwebsite@gmail.com</h2>
         `;
        let subject = 'Account reset';
        sendEmail(output, subject, email);
      })
    })
    con.release();
  })
}

function deleteUser(username) { //get the initial balance of the user
  dbconnection.getConnection(function (err, con) {
    con.query("DELETE FROM UserTable WHERE Username = ?", [username], function (err) {
      if (err) throw err;
      console.log("User successfully deleted")
    })
    con.release();
  })
}


router.get('/settings', (req, res) => {
  if (!req.cookies.username) res.redirect('/account/login')
  res.render('account/settings', {
    username: req.cookies.username
  })
})

router.post('/resetpassword', (req, res) => { //reset the users password
  var holdpassword = crypto.createHash('md5').update(req.body.oldpassword).digest('hex'); //h stands for hashed, i have no use for the passwords unhashed
  var hnewpassword = crypto.createHash('md5').update(req.body.newpassword).digest('hex');
  var username = req.cookies.username;
  
  checkPassword(username, function (err, password) {
    if (err) throw err
    if (password == holdpassword) { //if passwords match then update the password
      res.send({msg: "Password successfully updated"})
      updatePassword(username, hnewpassword)
    } else {
      res.send({msg: "Incorrect password"})
    }
  })
})

router.post('/resetaccount', (req, res) => { //reset the users account
  var enteredUsername = req.body.username;
  var username = req.cookies.username;

  if (enteredUsername == username) { //if the username entered matches the username in the cookie then reset the user in the database
    //firstly get the initial user balance
    getInitialBalance(username, function (err, results) {
      if (err) throw err;
      
      //then delete all transcations and orders from the database and add one initial one
      resetUser(username, results)
      reinitialiseWebsocket() //I realised it was easier to reinitialise the websocket than to try and update the data in the websocket object

      res.sendStatus(200)
    })
  } else {
    res.sendStatus(403)
  }
})

router.post('/deleteaccount', (req, res) => { //delete the users account
  var enteredUsername = req.body.username;
  var username = req.cookies.username;

  if (enteredUsername == username) { //if the username entered matches the username in the cookie then delete the user in the database

    getEmail(username, function (err, email) {
        if (err) throw err
        let output = `<h1>We're sorry to see you go</h1>
        <h2>Your account ${username} has been requested to be deleted and will br removed shortly</h2>
        `;
        let subject = 'Account Deleted';
        sendEmail(output, subject, email);
      

      deleteUser(username)
      reinitialiseWebsocket() //I realised it was easier to reinitialise the websocket than to try and update the data in the websocket object

      res.clearCookie('username')
      res.sendStatus(200)
    })
  } else {
    res.sendStatus(403)
  }
})

//everything below is now for the forgot password section of the account page

router.get('/forgotpassword', (req, res) => {
  res.render('account/forgotpassword')
})

var forgotpassword = {} //this object will hold the username and the code for the forgot password section
var authenticated = {} //this object will hold the username and a true or false for if they have authenticated themselves or not

router.post('/checkusername', (req, res) => {
  let username = req.body.username;

  checkIfUserExists(username, function (err, results) {
    if (err) throw err
    if (results == 1) { //if the user exists then send an email to the user

      let code = Math.floor(Math.random() * (999999 - 100000 + 1) + 100000) //generate a random 6 digit code 
      forgotpassword[username] = code //add the username and code to the forgotpassword object

      getEmail(username, function (err, email) {
        if (err) throw err

        let output = `<h1>Hi ${username},</h1>
        <h2>You have requested to reset your password, please enter the following code into the box below to continue</h2>
        <h2>${code}</h2>
        `;
        let subject = 'Forgot Password Reset';

        sendEmail(output, subject, email);

        setTimeout(function () { //after 5 minutes delete the username and code from the forgotpassword object
          delete forgotpassword[username]
        }, 300000)

        res.sendStatus(200)
      })
      
    } else {
      res.sendStatus(403)
    }
  })
})

router.post('/checkcode', (req, res) => {
  let username = req.body.username;
  let code = req.body.code;

  if (forgotpassword[username] == code) { //if the code matches the code in the forgotpassword object then send a success message
    authenticated[username] = true //add the username and true to the authenticated object
    res.sendStatus(200)
  } else {
    res.sendStatus(403)
  }
})

router.post('/newpassword', (req, res) => {
  let username = req.body.username;
  let password = req.body.password;

  if (authenticated[username]) { //if the user has been authenticated then update their password
    updatePassword(username, crypto.createHash('md5').update(password).digest('hex'))
    delete forgotpassword[username] //delete the username and code from the forgotpassword object
    delete authenticated[username] //delete the username and true from the authenticated object
    
    res.sendStatus(200)
  } else {
    res.sendStatus(403)
  }
})

//export the router to use in server.js
module.exports = router
