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

function getOrders(username, callback) {
    con.query("SELECT Type, Ticker, AvgOpen, Invested, Leverage FROM OrderTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?)", username, function (err, result, fields) {
        if (err) throw callback(err);
        callback(null, result)
    });
}

function getBalance(username, callback) {
    con.query("SELECT Balance FROM TransactionTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?) ORDER BY Date DESC LIMIT 1", username, function (err, result, fields) {
        if (err) throw callback(err);
        callback(null, result[0].Balance)
    });
}

function getPrices(tickers, callback) {
    si.getStocksInfo(tickers).then((data) => {
        bidprices = []
        askprices = []
        regularchangepercents = []
        regularMarketPrices = []
        displayName = []
        data.forEach(element => {
            //When stocks are pre or post state, there are no bid and ask prices therefore must use regularmarketprice
            if (element.bid == 0 || element.ask == 0) {
              bidprices.push(element.regularMarketPrice)
              askprices.push(element.regularMarketPrice)
            } else {
              bidprices.push(element.bid)
              askprices.push(element.ask)
            }
            regularchangepercents.push(element.regularMarketChangePercent)
            regularMarketPrices.push(element.regularMarketPrice)
            displayName.push(element.displayName)

        })
        callback(null, [bidprices, askprices, displayName, regularchangepercents, regularMarketPrices])
    });
}

function getProfitLoss(invested, current, avgopen, leverage, type) {
    if (type == 'buy') {
        value = (current / avgopen) * (invested * leverage)
    } else {
        value = (avgopen / current) * (invested * leverage)
    }
    userValue = (value - (invested * (leverage - 1))) * 0.99
    return userValue
}

//TIME TO MAKE THE ORDERS PAGE AND ILL ROUTE IT TO /home/orders
router.get('/orders', (req, res) => {
    var username = req.cookies.username;
    var allocated = 0;
    var totalpl = 0;
    var equity = 0;
    var tickers =[];
    getOrders(username, function (err, orders) {
        orders.reverse()
        getBalance(username, function (err, balance) {
            orders.forEach(order => {
                allocated += order.Invested
                tickers.push(order.Ticker)
            })
            
            getPrices(tickers, function(err, prices) {
                //prices[0] is bidprices
                //prices[1] is askprices
                //prices[2] is displayName
                orders.forEach((order, i) => {
                    order.value = order.Type == 'buy' ? getProfitLoss(order.Invested, prices[0][i], order.AvgOpen, order.Leverage, order.Type).toFixed(2) : getProfitLoss(order.Invested, prices[1][i], order.AvgOpen, order.Leverage, order.Type).toFixed(2)
                    order.numpl = Number((order.value - order.Invested).toFixed(2)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    order.percentage = (((order.value / order.Invested) - 1) * 100).toFixed(2) + '%'
                    order.valuecolor = order.value > order.Invested ? 'text-success' : 'text-danger'
                    order.displayName = prices[2][i]
                    order.units = (order.Invested / order.AvgOpen).toFixed(2)
                    order.Invested = order.Invested.toLocaleString('en-US', { style: 'currency', currency: 'USD' })        

                    equity += Number(order.value)
                    order.value = Number(order.value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                })
                
                totalpl = (equity - allocated).toFixed(2)
                equity = equity.toFixed(2)

                res.render("home/orders", {
                    username: username,
                    balance: balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                    available: (balance - allocated).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                    allocated: allocated.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                    totalpl: Number(totalpl).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                    totalplcolor: totalpl > 0 ? 'text-success' : 'text-danger',
                    equity: Number(equity).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                    orders: orders
                })
            })
        })
    })
})



module.exports = router