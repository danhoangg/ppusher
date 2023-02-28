const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const si = require("stock-info")

var mysql = require('mysql');

var connection = mysql.createPool({
    host: "sql7.freemysqlhosting.net",
    port: "3306",
    user: "sql7598748",
    password: "",
    database: "sql7598748",
    multipleStatements: true
});

connection.on('connection', function (connection) {
    console.log('Pool id %d connected', connection.threadId);
});

connection.on('enqueue', function () {
    console.log('Waiting for available connection slot');
});

global.con = connection

const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())
router.use(cookieParser())

function getAllTransactions(username, callback) {
    con.query("SELECT Date, Balance FROM TransactionTable JOIN UserTable ON UserTable.UserID = TransactionTable.UserID WHERE UserTable.Username = ?", username , function (err, result, fields) {
        if (err) callback(err)
        callback(null, result)
    })
}

router.get('/', (req, res) => {
    let username = req.cookies.username;
    var data = [];

    getAllTransactions(username, (err, results) => {
        
        for (i=0; i<results.length; i++) {
            var date = String(results[i].Date);
            //converting the date into a readable format for graph
            date = date.split(' ').slice(1, 5).join(' ');

            var balance = results[i].Balance;
            data.push([date, balance])
        }

        res.render("home/history", {
            username: username,
            data: data
        })
    })
})



module.exports = router