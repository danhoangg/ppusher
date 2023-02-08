function closeOrder(orderID) {
    fetch('/home/orders/closeorder', {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        orderID: orderID
      })
    })
}

setInterval(() => {
    fetch('/home/orders', {
      method: 'POST',
      redirect: 'follow',
      headers: {
        'content-type': 'application/json'
      }
    }).then((res) => {
      res.json().then((arr) => {
        $("#available").text(arr[0])
        $("#allocated").text(arr[1])
        $("#totalpl").text(arr[2])
        $("#totalpl").removeClass()
        $("#totalpl").addClass(arr[3])
        $("#equity").text(arr[4])
        arr[5].forEach((order, i) => {
            $("#percentage" + i).text(order.percentage)
            $("#percentage" + i).removeClass()
            $("#percentage" + i).addClass(order.valuecolor)
            $("#numpl" + i).text(order.numpl)
            $("#numpl" + i).removeClass()
            $("#numpl" + i).addClass(order.valuecolor)
            $("#value" + i).text(order.value)
        })
      })
    });
}, 1000)