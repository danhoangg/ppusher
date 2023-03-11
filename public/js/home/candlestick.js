data = []

var dataTable = anychart.data.table();
dataTable.addData(data);

// map data
var mapping = dataTable.mapAs({ 'open': 1, 'high': 2, 'low': 3, 'close': 4 });
var valueMapping = dataTable.mapAs({ 'value': 5 });

// set the chart type
var chart = anychart.stock();

// set the series
var plot = chart.plot(0);
var series = plot.candlestick(mapping);

// create an EMA indicator with period 20
var ema20 = plot.ema(mapping, 20).series();

// set the EMA color
ema20.stroke('#000000');

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

// create annotations
function createAnnotations() {
    var select = document.getElementById("typeSelect");
    plot.annotations().startDrawing({type: select.value, color: "black"});   
  }
  
// remove all annotations
function removeAll() {
    plot.annotations().removeAllAnnotations();
}

//cancel the drawing so user can use the mouse to zoom in/out, etc
function cancelDrawing() {
    plot.annotations().cancelDrawing();
}