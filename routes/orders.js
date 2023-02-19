const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const si = require("stock-info")

var mysql = require('mysql');

var con = mysql.createPool({
    host: "sql7.freemysqlhosting.net",
    port: "3306",
    user: "sql7598748",
    password: "",
    database: "sql7598748",
    multipleStatements: true
});

const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())
router.use(cookieParser())

function getOrders(username, callback) {
    con.query("SELECT Type, Ticker, AvgOpen, Invested, Leverage, OrderID FROM OrderTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?)", username, function (err, result, fields) {
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
            displayName.push(element.longName)
        })
        callback(null, [bidprices, askprices, displayName, regularchangepercents, regularMarketPrices])
    });
}

function getProfitLoss(invested, current, avgopen, leverage, type) {
    value = type == 'buy' ? (current / avgopen) * (invested * leverage) : (avgopen / current) * (invested * leverage);
    userValue = (value - (invested * (leverage - 1))) * 0.99
    return userValue
}

//Pretty much just querying a database and calculating a few values and rendering them to the screen
function updateValues(username, callback) {
    var allocated = 0;
    var totalpl = 0;
    var equity = 0;
    var tickers = [];
    getOrders(username, function (err, orders) {
        if (err) throw err
        getBalance(username, function (err, balance) {

            //If no orders, set all values to 0
            if (!orders.length) {
                balance = balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                available = balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                allocated = Number("0").toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                totalpl = Number("0").toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                totalplcolor = 'text-success'
                equity = balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                orders = []

                callback(null, balance, available, allocated, totalpl, totalplcolor, equity, orders)
            }

            orders.reverse()
            if (err) throw err
            orders.forEach(order => {
                allocated += order.Invested
                tickers.push(order.Ticker)
            })

            getPrices(tickers, function (err, prices) {
                //prices[0] is bidprices
                //prices[1] is askprices
                //prices[2] is displayName
                orders.forEach((order, i) => {
                    order.value = order.Type == 'buy' ? getProfitLoss(order.Invested, prices[0][i], order.AvgOpen, order.Leverage, order.Type).toFixed(2) : getProfitLoss(order.Invested, prices[1][i], order.AvgOpen, order.Leverage, order.Type).toFixed(2)
                    order.numpl = Number((order.value - order.Invested).toFixed(2)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    order.percentage = (((order.value / order.Invested) - 1) * 100).toFixed(2) + '%'
                    order.valuecolor = order.value > order.Invested ? 'text-success' : 'text-danger'
                    order.displayName = prices[2][i]
                    order.image = order.displayName.split(' ')[0].replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
                    order.units = (order.Invested / order.AvgOpen).toFixed(2)
                    order.Invested = order.Invested.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    order.orderid = order.OrderID

                    equity += Number(order.value)
                    order.value = Number(order.value).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                })

                totalpl = (equity - allocated).toFixed(2)
                equity = (balance + Number(totalpl)).toFixed(2)

                available = (balance - allocated).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                balance = balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                allocated = allocated.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                totalplcolor = totalpl > 0 ? 'text-success' : 'text-danger'
                totalpl = Number(totalpl).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                equity = Number(equity).toLocaleString('en-US', { style: 'currency', currency: 'USD' })

                callback(null, balance, available, allocated, totalpl, totalplcolor, equity, orders)

            })
        })
    })
}

//delete the order from the orders table and then add a transaction to the transactions table
function closeOrder(userid, transaction, balance, orderid, callback) {
    con.query('INSERT INTO TransactionTable (UserID, Transaction, Balance) VALUES (?, ?, ?); DELETE FROM OrderTable WHERE OrderID = ?', [userid, transaction, balance, orderid], function (err, results) {
        if (err) throw callback(err)
        console.log('Order successfully closed')
    })
}

function getUserID(username, callback) {
    con.query('SELECT UserID FROM UserTable WHERE username = ?', [username], function (err, results) {
        if (err) throw callback(err)
        callback(null, results[0].UserID)
    })
}

function checkTradeable(ticker, callback) {
    si.getSingleStockInfo(ticker).then(data => {
        callback(null, data.tradeable)
    });
}

//TIME TO MAKE THE ORDERS PAGE AND ILL ROUTE IT TO /home/orders
router.get('/orders', (req, res) => {
    var username = req.cookies.username;
    if (!username) res.redirect('/account/login')
    updateValues(username, function (err, balance, available, allocated, totalpl, totalplcolor, equity, orders) {
        res.render("home/orders", {
            username: username,
            balance: balance,
            available: available,
            allocated: allocated,
            totalpl: totalpl,
            totalplcolor: totalplcolor,
            equity: equity,
            orders: orders
        })
    })
})

//update values in realtime by constant post request to /home/orders
router.post('/orders', (req, res) => {
    let username = req.cookies.username
    updateValues(username, function (err, balance, available, allocated, totalpl, totalplcolor, equity, orders) {
        if (err) throw err;
        res.send([available, allocated, totalpl, totalplcolor, equity, orders])
    })
})

//gonna make post request to close order in /home/orders/closeorder
router.post('/orders/closeorder', (req, res) => {
    let orderid = req.body.orderID;
    let username = req.cookies.username;
    let closedOrder;

    //get all orders from the datbase
    getOrders(username, function (err, orders) {
        if (err) throw err;
        orders.reverse();
        closedOrder = orders.find(order => order.OrderID == orderid);
        if (!closedOrder) {
            res.sendStatus(403);
            return;
        }

        //Check if the order is tradeable
        checkTradeable(closedOrder.Ticker, function (err, tradeable) {
            if (!tradeable) {
                res.sendStatus(405);
                return;
            }
            //get the balance of the user
            getBalance(username, function (err, balance) {
                if (err) throw err;
                //get the current price of the stock
                getPrices([closedOrder.Ticker], function (err, prices) {
                    if (err) throw err;
                    //get the profit/loss of the order
                    let orderValue = closedOrder.Type == 'buy' ? getProfitLoss(closedOrder.Invested, prices[0][0], closedOrder.AvgOpen, closedOrder.Leverage, closedOrder.Type) : getProfitLoss(closedOrder.Invested, prices[1][0], closedOrder.AvgOpen, closedOrder.Leverage, closedOrder.Type)
                    getUserID(username, function (err, userid) {
                        let transaction = Number((orderValue - closedOrder.Invested).toFixed(2))
                        let newBalance = Number(balance) + Number(transaction)
                        closeOrder(userid, transaction, newBalance, orderid, function (err) {
                            if (err) throw err;
                            res.redirect('/home/orders')
                        })
                    })
                })
            })
        })
    })
})

module.exports = router