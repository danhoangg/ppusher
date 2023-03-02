data = []

var dataTable = anychart.data.table();
dataTable.addData(data);

// map data
var mapping = dataTable.mapAs({ 'open': 1, 'high': 2, 'low': 3, 'close': 4 });
var valueMapping = dataTable.mapAs({ 'value': 5 });

// set the chart type
var chart = anychart.stock();

// set the series
var series = chart.plot(0).candlestick(mapping);

//plot the volume underneath
var volumePlot = chart.plot(1);
volumePlot.height('30%');
volumePlot.yAxis().labels().format('{%Value}{scale:(1000)|(k)}');

var volumeSeries = volumePlot.column(valueMapping);
volumeSeries.name('Volume');

// set the series color
series.fallingFill("red");
series.fallingStroke("red");
series.risingFill("green");
series.risingStroke("green");

series.name(`Trade Data`);

// set the chart title
chart.title(`Trade Data`);

// set the container id
chart.container('container');

// draw the chart
chart.draw();

function drawStock(ticker) {
    dataTable.remove(0, 365)

    //send post request to get historical data for stocks
    fetch('/home/getHistorical', {
        method: 'POST',
        redirect: 'follow',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({ticker: ticker})     //send the ticker to the server
    }).then((res) => {
        res.json().then((objectData) => {
            data = []
            //convert the object to a 2d array
            objectData.forEach((e) => {
                data.push([e.date, e.open, e.high, e.low, e.close, e.volume])
            })
            data.reverse()

            dataTable.addData(data)
            series.name(`${ticker.toUpperCase()} Trade Data`);
            chart.title(`${ticker.toUpperCase()} Trade Data`);
        })
    });
}