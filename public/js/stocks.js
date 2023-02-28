function buy() {
  if ($("#orderbuyinput").hasClass("d-none")) {
    $("#ordersellinput").addClass("d-none")
    $("#orderbuyinput").removeClass("d-none")
  } else {
    $("#orderbuyinput").addClass("d-none")
  }
}

function sell() {
  if ($("#ordersellinput").hasClass("d-none")) {
    $("#orderbuyinput").addClass("d-none")
    $("#ordersellinput").removeClass("d-none")
  } else {
    $("#ordersellinput").addClass("d-none")
  }
}

function placebuyorder(ticker) {
  var data = {
    ticker: ticker,
    invested: $("#binvested").val(),
    type: "buy",
    leverage: $("#bleverage").val(),
    stoploss: $("#bstoploss").val(),
    takeprofit: $("#btakeprofit").val()
  }
  data.leverage = !data.leverage ? 1 : data.leverage
  $("#error").text(data.invested <= 0 || !data.invested || isNaN(data.invested) ? "Invalid invested amount" : data.leverage <= 0 || !Number.isInteger(Number(data.leverage)) || data.leverage > 10 ? "Invalid leverage amount, must be integer between 1-10" : data.stoploss && isNaN(data.stoploss) ? "Invalid stoploss input" : data.takeprofit && isNaN(data.takeprofit) ? "Invalid takeprofit input" : "")

  if (data.invested <= 0 || !data.invested || isNaN(data.invested) || data.leverage <= 0 || !Number.isInteger(Number(data.leverage)) || data.leverage > 10 || (data.stoploss && isNaN(data.stoploss)) || (data.takeprofit && isNaN(data.takeprofit))) return;

  fetch('/stocks/placeorder', {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then((res) => {
    res.json().then((arr) => {
      $("#error").text(arr[0])
    })
  })
}

function placesellorder(ticker) {
  var data = {
    ticker: ticker,
    invested: $("#sinvested").val(),
    type: "sell",
    leverage: $("#sleverage").val(),
    stoploss: $("#sstoploss").val(),
    takeprofit: $("#stakeprofit").val()
  }
  data.leverage = !data.leverage ? 1 : data.leverage
  $("#error2").text(data.invested <= 0 || !data.invested || isNaN(data.invested) ? "Invalid invested amount" : data.leverage <= 0 || !Number.isInteger(Number(data.leverage)) || data.leverage > 10 ? "Invalid leverage amount, must be integer between 1-10" : data.stoploss && (isNaN(data.stoploss) || data.stopless < 0) ? "Invalid stoploss input" : data.takeprofit && (isNaN(data.takeprofit) || data.takeprofit < 0) ? "Invalid takeprofit input" : "")

  if (data.invested <= 0 || !data.invested || isNaN(data.invested) || data.leverage <= 0 || !Number.isInteger(Number(data.leverage)) || data.leverage > 10 || (data.stoploss && (isNaN(data.stoploss) || data.stopless < 0)) || (data.takeprofit && (isNaN(data.takeprofit) || data.takeprofit < 0))) return;

  fetch('/stocks/placeorder', {
    method: 'POST',
    redirect: 'follow',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(data)
  }).then((res) => {
    res.json().then((arr) => {
      $("#error").text(arr[0])
      $("#error2").text(arr[0])
    })
  })
}

//playing around with websockets

const websocket = new WebSocket("ws://localhost:8080");

websocket.addEventListener("open", () => {
  console.log("Connected to websocket");
});

websocket.addEventListener("message", (msg) => {
  data = JSON.parse(msg.data);

  $("#price").text(data.price);
  $("#change").html("&nbsp;&nbsp;&nbsp;&nbsp;" + data.change.toFixed(2) + "(" + data.changePercent.toFixed(2) + "%)")
  $("#change").removeClass('text-success text-danger')
  $("#change").addClass(data.changeColor)
  $("#bid").text(data.bid)
  $("#ask").text(data.ask)
})
