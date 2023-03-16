const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const si = require("stock-info")

var transporter = require('./config.js').transporter;
var dbconnection = require('./config.js').mysql_pool;

const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())
router.use(cookieParser())

var addOrder = require('./orders.js').addOrder

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
    res.render('stockerror', {
        username: req.cookies.username
    })
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
        quote.marketState = data.marketState;
        callback(null, quote)
    }).catch((err) => {
        callback(err)
    })
}

function getInvested(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("SELECT Invested FROM OrderTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?)", [username], (err, result) => {
            if (err) throw callback(err);
            callback(null, result);
        })
        con.release();
    });
}

function getBalance(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("SELECT Balance FROM TransactionTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?) ORDER BY Date DESC LIMIT 1", username, function (err, result, fields) {
            if (err) throw callback(err);
            callback(null, result[0].Balance)
        });
        con.release();
    });
}

//get userid from the username
function getUserID(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("SELECT UserID FROM UserTable WHERE username = ?", username, function (err, result, fields) {
            if (err) throw callback(err);
            callback(null, result[0].UserID)
        });
        con.release()
    });
}

//store the order into the order table in the database
function storeOrder(userid, type, ticker, avgopen, invested, leverage, stoploss, takeprofit, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("INSERT INTO OrderTable (UserID, Type, Ticker, AvgOpen, Invested, Leverage, StopLoss, TakeProfit) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [userid, type, ticker, avgopen, invested, leverage, stoploss, takeprofit], function (err, result, fields) {
            if (err) throw callback(err);
            callback(null, result)
        });
        con.release()
    });
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

router.post('/placeorder', (req, res) => {
    var username = req.cookies.username;
    var order = req.body;
    orderStockInfo(order.ticker, order.type, (err, quote) => {
        if (err) throw err;

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
                if (quote.marketState == "CLOSED") {
                    res.send(['Stock is not tradeable now, unable to place order'])

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
                        storeOrder(userid, order.type, order.ticker.toLowerCase(), Number(quote.price.toFixed(2)), Number(order.invested), Number(order.leverage), Number(Number(order.stoploss).toFixed(2)), order.takeprofit ? order.takeprofit : null, (err, result) => {
                            if (err) throw err;
                            addOrder(result.insertId, order.type, order.ticker.toLowerCase(), Number(Number(order.stoploss).toFixed(2)), order.takeprofit ? order.takeprofit : null, username)
                            
                            getEmail(username, (err, email) => {
                                if(err) throw err;

                                let output = `
                                    <h1>New position opened for account ${username}</h1>
                                    <p>A new ${order.type} order has been placed ID: ${result.insertId}</p>
                                    <ul>
                                        <li>Symbol: ${order.ticker.toUpperCase()}</li>
                                        <li>Time opened: ${new Date()}</li>
                                        <li>Invested: ${Number(order.invested).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</li>
                                        <li>Leverage: ${order.leverage}</li>
                                        <li>${order.type[0].toUpperCase() + order.type.slice(1)} price: ${Number(quote.price.toFixed(2))}</li>
                                    </ul>
                                `;
                                let subject = "New position opened";

                                sendEmail(output, subject, email);

                            })

                            res.send(['Order placed successfully'])
                        })
                    })

                }


            })
        })

    })

})

//using a post request to update the values on the website
router.post('/:ticker', (req, res) => {
    var ticker = req.params.ticker;

    stockInfo(ticker, (err, quote) => {
        if (err) throw err
        if (!quote.bid || !quote.ask) quote.bid = quote.regularMarketPrice; quote.ask = quote.regularMarketPrice
        res.send({
            price: quote.regularMarketPrice.toFixed(2),
            change: quote.regularChange,
            changePercent: quote.regularChangePercent,
            changeColor: quote.regularChange >= 0 ? 'text-success' : 'text-danger',
            bid: quote.bid,
            ask: quote.ask
        })
    })
})


module.exports = router