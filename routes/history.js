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

router.get('/', (req, res) => {
    let username = req.cookies.username;
    res.render("home/history", {
        username: username
    })
})



module.exports = router