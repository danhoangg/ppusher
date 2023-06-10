const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')

var dbconnection = require('./config.js').mysql_pool;

const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())
router.use(cookieParser())

function getAllTransactions(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("SELECT Date, Balance FROM TransactionTable JOIN UserTable ON UserTable.UserID = TransactionTable.UserID WHERE UserTable.Username = ?", username, function (err, result, fields) {
            if (err) callback(err)
            callback(null, result)
        })
        con.release()
    })
}

router.get('/', (req, res) => {
    let username = req.cookies.username;
    var data = [];

    getAllTransactions(username, (err, results) => {

        for (i = 0; i < results.length; i++) {
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