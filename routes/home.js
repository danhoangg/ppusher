const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const alpha = require('alphavantage')({ key: '' });

var mysql = require('mysql');

var con = mysql.createConnection({
    host: "sql7.freemysqlhosting.net",
    port: "3306",
    user: "sql7579297",
    password: "",
    database: "sql7579297"
});

con.connect(function (err) { });

const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())
router.use(cookieParser())

//function gets all info to be rendered on the page
function getAccountInfo(username, callback) { 
    con.query("SELECT TransactionTable.Balance FROM UserTable JOIN TransactionTable ON UserTable.UserID = TransactionTable.UserID WHERE username = ?", username, function (err, result, fields) {
        if (err) throw callback(err);
        callback(null, result[0].Balance)
    });
}

//function to get the users transactions
function getTransactions(username, callback) {
    //get date from one month ago
    var monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);
    monthAgo = monthAgo.toISOString().slice(0, 19).replace('T', ' ');

    //Selects all transactions from the last month so I can get the first one and then minus it from the current balance
    con.query("SELECT TransactionTable.Balance FROM UserTable JOIN TransactionTable ON UserTable.UserID = TransactionTable.UserID WHERE username = ? AND TransactionTable.Date > ? ORDER BY TransactionTable.Date", [username, monthAgo], function (err, result, fields) {
        if (err) throw callback(err);
        callback(null, result)
    });
}


//If user is logged in, redirect to home page, else redirect to login page
router.get('/', (req, res) => {
    let cookie = req.cookies.username
    if (cookie) {

        //so many callbacks :o
        getAccountInfo(cookie, function (err, balance) {
            if (err) throw err;
            getTransactions(cookie, function (err, transactions) {
                if (err) throw err;
                monthpl = balance - transactions[0].Balance
                monthpl = monthpl.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
                if (monthpl => 0) { monthcolor = "text-success" } else { monthcolor = "text-danger" }
                res.render("home", {
                    username: cookie,
                    balance: balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                    monthpl: monthpl,
                    monthcolor: monthcolor
                })
            });
        })
    } else {
        res.redirect('/account/login')
    }
});



//export router to server.js
module.exports = router