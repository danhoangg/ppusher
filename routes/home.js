const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const si = require("stock-info")
var yahooFinance = require("yahoo-finance")

var dbconnection = require('./config.js').mysql_pool;

const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())
router.use(cookieParser())

const ordersRouter = require('./orders')
const historyRouter = require('./history')
router.use('/orders', ordersRouter)
router.use('/history', historyRouter)

//function gets all info to be rendered on the page
function getAccountInfo(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("SELECT TransactionTable.Balance FROM UserTable JOIN TransactionTable ON UserTable.UserID = TransactionTable.UserID WHERE username = ?", [username], function (err, result, fields) {
            if (err) throw callback(err);
            result.reverse();
            callback(null, result[0].Balance)
        });
        con.release();
    });
}

//function to get the users transactions
function getTransactions(username, callback) {
    //get date from one month ago
    var monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);
    monthAgo = monthAgo.toISOString().slice(0, 19).replace('T', ' ');

    dbconnection.getConnection(function (err, con) {
        //Selects all transactions from the last month so I can get the first one and then minus it from the current balance
        con.query("SELECT TransactionTable.Balance FROM UserTable JOIN TransactionTable ON UserTable.UserID = TransactionTable.UserID WHERE username = ? AND TransactionTable.Date > ? ORDER BY TransactionTable.Date", [username, monthAgo], function (err, result, fields) {
            if (err) throw callback(err);
            callback(null, result)
        });
        con.release()
    });
}

//function for seeing profit/loss of current invested
function getProfitLoss(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("SELECT OrderTable.Type, OrderTable.Ticker, OrderTable.AvgOpen, OrderTable.Invested, OrderTable.Leverage FROM UserTable JOIN OrderTable ON UserTable.UserID = OrderTable.UserID WHERE username = ?", username, function (err, result, fields) {
            if (err) throw callback(err);
            callback(null, result);
        });
        con.release();
    });
}

function getPrices(tickers, callback) {
    si.getStocksInfo(tickers).then((data) => {
        bidprices = []
        askprices = []
        regularchangepercents = []
        regularMarketPrices = []
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
        })
        callback(null, bidprices, askprices, regularchangepercents, regularMarketPrices)
    });
}

//Current should be attuned to either bid or ask price depending on if the user is buying or selling
function calcValue(invested, current, avgopen, leverage, type) {
    if (type == 'buy') {
        value = (current / avgopen) * (invested * leverage)
    } else {
        value = (avgopen / current) * (invested * leverage)
    }
    userValue = (value - (invested * (leverage - 1))) * 0.99
    return userValue
}

//this is genuinely the weirdest way I've ever done this
//I've had to make sure that loops through arrays happen within functions and callbacks occur in the same scope otherwise it just breaks, but it works so I'm not complaining
//Which explains the excessive use of .forEach
function getTotalValue(profitloss, callback) {
    var totalinvested = 0;
    var totalvalue = 0;
    var stocks = [];
    var counter = 0;
    profitloss.forEach(element => {
        stocks.push(element.Ticker)
    })
    getPrices(stocks, function (err, bidprices, askprices, regularchangepercents, regularMarketPrices) {
        if (err) throw err
        profitloss.forEach(element => {
            totalinvested += element.Invested;
            if (element.Type == "buy") {
                totalvalue += calcValue(element.Invested, bidprices[counter], element.AvgOpen, element.Leverage, element.Type)
            } else {
                totalvalue += calcValue(element.Invested, askprices[counter], element.AvgOpen, element.Leverage, element.Type)
            }
            counter++;
        })
        callback(null, totalinvested, totalvalue, regularMarketPrices, regularchangepercents)
    });
}

//so many callbacks :o
//this looks like hell but read the function names and it should make sense
//all this is is getting the data from the database and stock market and then rendering it on the page
function updateValues(cookie, callback) {
    getAccountInfo(cookie, function (err, balance) {
        if (err) throw err
        getTransactions(cookie, function (err, transactions) {
            if (err) throw err;
            if (transactions.length === 0) { transactions = [{ Balance: balance }] }
            var monthpl = balance - transactions[0].Balance
            var monthcolor = monthpl >= 0 ? "text-success" : "text-danger"
            monthpl = monthpl.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
            getProfitLoss(cookie, function (err, profitloss) {
                if (err) throw err;
                if (profitloss.length == 0) {
                    callback(null, balance, monthpl, monthcolor, balance, 0, 0, "text-success", [])
                }
                getTotalValue(profitloss, function (err, totalinvested, totalvalue, currentprices, regularchangepercents) {
                    if (err) throw err;
                    cashavailable = (balance - totalinvested);
                    totalpl = (totalvalue - totalinvested)
                    if (totalpl >= 0) { currentcolor = "text-success" } else { currentcolor = "text-danger" };
                    latestorders = []
                    counter = 0;
                    currentprices.forEach(element => {
                        percentage = (regularchangepercents[counter]).toFixed(2);
                        try {
                            if (profitloss[counter].Ticker != profitloss[counter - 1].Ticker) {
                                if (percentage >= 0) {
                                    latestorders.push({ ticker: profitloss[counter].Ticker, type: profitloss[counter].Type, currentprice: element, percentage: percentage, percentagecolor: "text-success" })
                                } else {
                                    latestorders.push({ ticker: profitloss[counter].Ticker, type: profitloss[counter].Type, currentprice: element, percentage: percentage, percentagecolor: "text-danger" })
                                }
                            }
                        } catch (e) {
                            if (percentage >= 0) {
                                latestorders.push({ ticker: profitloss[counter].Ticker, type: profitloss[counter].Type, currentprice: element, percentage: percentage, percentagecolor: "text-success" })
                            } else {
                                latestorders.push({ ticker: profitloss[counter].Ticker, type: profitloss[counter].Type, currentprice: element, percentage: percentage, percentagecolor: "text-danger" })
                            }
                        }
                        counter++;
                    })

                    //remove duplicates from the latestorders array
                    let dict = {} //make dictionary to store tickers to count if there are duplicates
                    latestorders.forEach((element, index) => {
                        if (dict[element.ticker] == undefined) {
                            dict[element.ticker] = 1
                        } else {
                            latestorders.splice(index, 1)
                        }
                    });
                    latestorders = latestorders.reverse()
                    latestorders = latestorders.slice(0, 3)
                    callback(null, balance, monthpl, monthcolor, cashavailable, totalinvested, totalpl, currentcolor, latestorders)
                })
            });
        });
    })
}

function getHistorical(ticker, callback) {
    let now = new Date();
    let yearAgo = new Date();
    yearAgo.setFullYear(now.getFullYear() - 1);

    now.toISOString().split('T')[0]
    yearAgo.toISOString().split('T')[0]

    yahooFinance.historical({
        symbol: ticker.toUpperCase(),
        from: yearAgo,
        to: now,
        period: 'd'
    }, function (err, quotes) {
        if (err) callback(err)
        callback(null, quotes)
    });
}

//If user is logged in, redirect to home page, else redirect to login page
router.get('/', (req, res) => {
    let cookie = req.cookies.username
    if (cookie) {

        updateValues(cookie, function (err, balance, monthpl, monthcolor, cashavailable, totalinvested, totalpl, currentcolor, latestorders) {
            if (err) throw err;
            res.render("home", {
                username: cookie,
                balance: balance.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                monthpl: monthpl,
                monthcolor: monthcolor,
                cashavailable: cashavailable.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                totalinvested: totalinvested.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                totalpl: totalpl.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
                currentcolor: currentcolor,
                latestorders: latestorders
            })
        })

    } else {
        res.redirect('/account/login')
    }
});

router.post('/getHistorical', (req, res) => {
    let ticker = req.body.ticker
    getHistorical(ticker, function (err, quotes) {
        res.send(JSON.stringify(quotes))
    })
})

//GOT AN IDEA, SEND POST REQUEST TO SERVER FROM FRONTEND JAVASCRIPT TO UPDATE VALUES
//then just setinterval on the frontend and replace values on the home page to keep up to date with markets
router.post('/', (req, res) => {
    let cookie = req.cookies.username
    updateValues(cookie, function (err, balance, monthpl, monthcolor, cashavailable, totalinvested, totalpl, currentcolor, latestorders) {
        if (err) throw err;
        newValues = {
            totalpl: totalpl.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
            currentcolor: currentcolor,
        }
        res.send([newValues, latestorders])
    })
})

router.get('/:err', (req, res) => {
    res.redirect('/')
})

//export router to server.js
module.exports = router
