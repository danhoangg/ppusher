const express = require('express')
const bodyParser = require('body-parser')
const cookieParser = require('cookie-parser')
const si = require("stock-info")

const WebSocket = require('ws')
const socket = new WebSocket(
    'wss://ws.finnhub.io?token=' //create socket for finnhub, stock trading websocket api
);

var dbconnection = require('./config.js').mysql_pool;

const router = express.Router()

router.use(bodyParser.urlencoded({ extended: true }))
router.use(bodyParser.json())
router.use(cookieParser())

function getOrders(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("SELECT Type, Ticker, AvgOpen, Invested, Leverage, OrderID FROM OrderTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?)", username, function (err, result, fields) {
            if (err) throw callback(err);
            callback(null, result)
        });
        con.release();
    });
}

function getBalance(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query("SELECT Balance FROM TransactionTable WHERE UserID = (SELECT UserID FROM UserTable WHERE username = ?) ORDER BY Date DESC LIMIT 1", username, function (err, result, fields) {
            if (err) throw callback(err);
            callback(null, result[0].Balance)
        });
        con.release()
    });
}

function getPrices(tickers, callback) {
    si.getStocksInfo(tickers).then((data, err) => {
        if (err) callback(err)
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
                if (err) throw err
                //prices[0] is bidprices
                //prices[1] is askprices
                //prices[2] is displayName
                orders.forEach((order, i) => {
                    order.value = order.Type == 'buy' ? getProfitLoss(order.Invested, prices[0][i], order.AvgOpen, order.Leverage, order.Type).toFixed(2) : getProfitLoss(order.Invested, prices[1][i], order.AvgOpen, order.Leverage, order.Type).toFixed(2)
                    order.numpl = Number((order.value - order.Invested).toFixed(2)).toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                    order.percentage = (((order.value / order.Invested) - 1) * 100).toFixed(2) + '%'
                    order.valuecolor = order.value > order.Invested ? 'text-success' : 'text-danger'
                    order.displayName = prices[2][i]
                    order.image = order.displayName.split(' ')[0].split(/([_\W])/)[0];
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
function removeRecords(userid, transaction, balance, orderid, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query('INSERT INTO TransactionTable (UserID, Transaction, Balance) VALUES (?, ?, ?); DELETE FROM OrderTable WHERE OrderID = ?', [userid, transaction, balance, orderid], function (err, results) {
            if (err) throw callback(err)
            console.log('Order successfully closed')
        })
        con.release();
    });
}

function getUserID(username, callback) {
    dbconnection.getConnection(function (err, con) {
        con.query('SELECT UserID FROM UserTable WHERE username = ?', [username], function (err, results) {
            if (err) throw callback(err)
            callback(null, results[0].UserID)
        })
        con.release()
    });
}

function checkTradeable(ticker, callback) {
    si.getSingleStockInfo(ticker).then(data => {
        callback(null, data.marketState == "CLOSED" ? false : true)
    });
}

//TIME TO MAKE THE ORDERS PAGE AND ILL ROUTE IT TO /home/orders
router.get('/', (req, res) => {
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
router.post('/', (req, res) => {
    let username = req.cookies.username
    updateValues(username, function (err, balance, available, allocated, totalpl, totalplcolor, equity, orders) {
        if (err) throw err;
        res.send([available, allocated, totalpl, totalplcolor, equity, orders])
    })
})

function closeOrder(orderid, username, callback) {
    let closedOrder;
    getOrders(username, function (err, orders) {
        if (err) throw err;
        orders.reverse();
        closedOrder = orders.find(order => order.OrderID == orderid);
        if (!closedOrder) {
            callback(null, 403);
            return;
        }
        try {
            //Check if the order is tradeable
            checkTradeable(closedOrder.Ticker, function (err, tradeable) {
                if (err) throw err
                if (!tradeable) {
                    callback(null, 405);
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
                            removeRecords(userid, transaction, newBalance, orderid, function (err) {
                                if (err) throw err;

                                removeOrder(orderid, closedOrder.Ticker)
                                callback(null, 200);
                                return;
                            })
                        })
                    })
                })
            })
        } catch (e) {
            console.log(e)
        }
    })
}

//gonna make post request to close order in /home/orders/closeorder
router.post('/closeorder', (req, res) => {
    let orderid = req.body.orderID;
    let username = req.cookies.username;
    closeOrder(orderid, username, function (err, status) {
        if (err) throw err
        res.send(status)
    })

})

//new idea for keeping track of user stoplosses and takeprofits
//create object of all orders and create dictionary of tickers
//websocket connection, on message received check it against the stoplosses and act accordingly
//when someone closes order remove it from object and reduce dictionry of tickers by one, if it reaches 0 then remove it from dictionary and unsubscribe from websocket
function getAllOrders(callback) { //get stop loss and take profits of all orders
    dbconnection.getConnection(function (err, con) {
        con.query('SELECT OrderID, Type, Ticker, StopLoss, TakeProfit, UserTable.Username FROM OrderTable JOIN UserTable ON UserTable.UserID = OrderTable.UserID', function (err, results) {
            if (err) throw callback(err)
            callback(null, results)
        })
        con.release()
    });
}

function subscribe(symbol) { // function to subscribe a ticker to the websocket
    socket.send(JSON.stringify({ type: 'subscribe', symbol: symbol }));
}

function unsubscribe(symbol) { //function to unsubscribe a ticker from the websocket
    socket.send(JSON.stringify({ type: 'unsubscribe', symbol: symbol }));
}

//initialising the two objects
var orders = {}; //an object of tickers and each ticker contains all the orders, ive decided this will be the most efficient way of checking through all orders for stoplosses and takeprofits
var tickers = {}; //an object of tickers but contains number of each ticker 

function removeOrder(orderid, ticker) {
    tickers[ticker] -= 1;
    if (tickers[ticker] == 0) {
        delete tickers[ticker];
        unsubscribe(ticker);
    }

    let index = orders[ticker].findIndex(order => order.OrderID == orderid);
    orders[ticker].splice(index, 1);
    console.log(orders)
}

function addOrder(OrderID, Type, Ticker, StopLoss, TakeProfit, Username) {
    let order = {
        OrderID: OrderID,
        Type: Type,
        Ticker: Ticker,
        StopLoss: StopLoss,
        TakeProfit: TakeProfit,
        Username: Username
    }

    orders[Ticker] = !orders[Ticker] ? [order] : [...orders[Ticker], order];
    tickers[Ticker] = !tickers[Ticker] ? 1 : tickers[Ticker] + 1;
    if (tickers[Ticker] === 1) subscribe(Ticker.toUpperCase())
    console.log(orders)
}

//initialise the websocket connection
socket.addEventListener('open', function (event) {
    console.log('websocket connected')

    getAllOrders(function (err, results) { //iniialise all the variables to start websocket connection and check for stoplosses and takeprofits
        if (err) throw err;
        if (results.length !== 0) {
            results.forEach(order => {
                tickers[order.Ticker] = !tickers[order.Ticker] ? 1 : tickers[order.Ticker] + 1; //if tickers.ticker doesnt exist then make it and set it to 1, else add 1 to it
                orders[order.Ticker] = !orders[order.Ticker] ? [order] : [...orders[order.Ticker], order]; //if orders.ticker doesnt exist make it, else append it to the end
            })
            console.log(orders)
            Object.keys(tickers).forEach(ticker => {
                subscribe(ticker.toUpperCase());
            }); //subscribe to all tickers
        }
    })
});

// Listen for messages
socket.addEventListener('message', function (event) {
    let data = JSON.parse(event.data).data;
    let limitedData = [];

    if (data) {
        //rate limit by deleting duplicate messages
        dict = {};
        data.reverse();
        data.forEach((quote, i) => {
            if (!dict[quote.s]) {
                limitedData.push(quote)
                dict[quote.s] = 1 //indidcate that the ticker has been added to the array
            }
        })
        data = limitedData;
        //limited data specifically only has one quote for each ticker for each message as too many causing problems
        data.forEach(quote => {
            orders[quote.s.toLowerCase()].forEach(order => {
                if (((quote.p <= order.StopLoss || (order.TakeProfit && quote.p >= order.TakeProfit)) && order.Type == 'buy') || ((quote.p >= order.StopLoss || (order.TakeProfit && quote.p <= order.TakeProfit)) && order.Type == 'sell')) { 
                    closeOrder(order.OrderID, order.Username, function(err, status) {
                        if (err) throw err
                        if (status === 200) {
                            console.log('Order closed successfully')
                            //remove the order from the orders object
                            removeOrder(order.OrderID, quote.s.toLowerCase())
                        }
                    })
                }
            }); //check each order for stoplosses and takeprofits
        })
    }
});



module.exports = {router: router, addOrder: addOrder} //export both router and addOrder functoin