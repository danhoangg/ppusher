const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const si = require("stock-info")

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

//TIME TO MAKE THE ORDERS PAGE AND ILL ROUTE IT TO /home/orders
router.get('/orders', (req, res) => {
    //wait up i gotta make static part of website first
    res.render("home/orders")
})

module.exports = router