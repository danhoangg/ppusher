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

//function to get the important stock info
function stockInfo(ticker, callback) {
    var quote = {};
    si.getSingleStockInfo(ticker).then((data) => {
        quote.regularMarketPrice = data.regularMarketPrice;
        quote.regularChange = data.regularMarketChange;
        quote.regularChangePercent = data.regularMarketChangePercent;
        quote.displayName = data.longName
        quote.bid = data.bid;
        quote.ask = data.ask;
        quote.image = data.longName.split(' ')[0].split(/([_\W])/)[0];
        callback(null, quote);
    }).catch((err) => {
        callback(err)
    })
}

router.get('/', (req, res) => {
    res.redirect('/home')
})

router.get('/error', (req, res) => {
    res.send('Error: Invalid Ticker')
})

router.get('/:ticker', (req, res) => {
    var username = req.cookies.username;
    var ticker = req.params.ticker;
    if (!username) res.redirect('/login')

    stockInfo(ticker, (err, quote) => {
        if (err) {
            res.redirect('/stocks/error')
        } else {
            res.render('stocks', {
                username: username,
                ticker: ticker,
                image: quote.image,
                price: quote.regularMarketPrice,
                change: quote.regularChange,
                changePercent: quote.regularChangePercent,
                displayName: quote.displayName,
                bid: quote.bid,
                ask: quote.ask
            })
        } 
    })
})

//calculates the minimum/maximum value a stock can reach before it automatically closes the position
function calcMarginCall(type, avgopen, leverage) {
    let marginCall;
    if (type == 'buy') {
        marginCall = avgopen * (((2 * leverage) - 1) / (2 * leverage));
    } else {
        marginCall = (leverage * avgopen) / (leverage - 0.5)
    }
    return marginCall;
}

//function to get necessary info for the order post request
function orderStockInfo(ticker, type, callback) {
    let quote = {};
    si.getSingleStockInfo(ticker).then((data) => {
        if (!data.ask || !data.bid) { quote.price = data.regularMarketPrice } else { quote.price = type == 'buy' ? data.ask : data.bid }
        quote.tradeable = data.tradeable;
        callback(null, quote)
    }).catch((err) => {
        callback(err)
    })
}

function getInvested(username, callback) {
    con.query("SELECT Invested FROM OrderTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?)", [username], (err, result) => {
        if (err) throw callback(err);
        callback(null, result);
    })
}

function getBalance(username, callback) {
    con.query("SELECT Balance FROM TransactionTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?) ORDER BY Date DESC LIMIT 1", username, function (err, result, fields) {
        if (err) throw callback(err);
        callback(null, result[0].Balance)
    });
}

//get userid from the username
function getUserID(username, callback) {
    con.query("SELECT UserID FROM UserTable WHERE username = ?", username, function (err, result, fields) {
        if (err) throw callback(err);
        callback(null, result[0].UserID)
    });
}

//store the order into the order table in the database
function storeOrder(userid, type, ticker, avgopen, invested, leverage, stoploss, takeprofit, callback) {
    con.query("INSERT INTO OrderTable (UserID, Type, Ticker, AvgOpen, Invested, Leverage, StopLoss, TakeProfit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [userid, type, ticker, avgopen, invested, leverage, stoploss, takeprofit], function (err, result, fields) {
        if (err) throw callback(err);
        callback(null, result)
    });
}

router.post('/placeorder', (req, res) => {
    var username = req.cookies.username;
    var order = req.body;
    orderStockInfo(order.ticker, order.type, (err, quote) => {
        if(err) throw err;

        var margincall = calcMarginCall(order.type, quote.price, order.leverage);
        order.stoploss = !order.stoploss ? margincall : order.stoploss;

        getBalance(username, (err, balance) => {
            if (err) throw err;
            getInvested(username, (err, invested) => {
                if (err) throw err;
                let total = 0;
                if (invested.length > 0) {
                    invested.forEach((element) => {
                        total += element.Invested;
                    })
                }

                //Checking if stock is tradeable
                if (!quote.tradeable) {
                    res.send(['Stock is not tradeable, unable to place order'])

                    //checking validity of the stop losses and take profits
                } else if ((order.stoploss < margincall && order.type == 'buy') || (order.stoploss > margincall && order.type == 'sell')) {
                    res.send([`Stop loss cannot exceed margin call value, ${margincall.toFixed(2)}`])
                } else if (order.takeprofit && ((order.takeprofit <= quote.price && order.type == 'buy') || (order.takeprofit >= quote.price && order.type == 'sell'))) {
                    res.send(['Take profit cannot exceed current price'])
                } else if ((order.stoploss >= quote.price && order.type == 'buy') || (order.stoploss <= quote.price && order.type == 'sell')) {
                    res.send(['Stop loss cannot exceed current price'])
                } else if (balance - total < order.invested) {
                    res.send(['Insufficient funds'])
                } else {
                    //Now that all checks are done, order can be placed in the database
                    getUserID(username, (err, userid) => {
                        if (err) throw err;
                        storeOrder(userid, order.type, order.ticker, quote.price, order.invested, order.leverage, order.stoploss, order.takeprofit, (err, result) => {
                            if (err) throw err;
                            res.send(['Order placed successfully'])
                        })
                    })
                    
                }

                
            })
        })

    })

})

router.post('/:ticker', (req, res) => {
    var ticker = req.params.ticker;

    stockInfo(ticker, (err, quote) => {
        if (err) throw err
        res.send({
            price: quote.regularMarketPrice,
            change: quote.regularChange,
            changePercent: quote.regularChangePercent,
            changeColor: quote.regularChange >= 0 ? 'text-success' : 'text-danger',
            bid: quote.bid,
            ask: quote.ask
        })
    })
})

module.exports = router