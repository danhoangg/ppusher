fetch('/home/getHistorical', {
    method: 'POST',
    redirect: 'follow',
    headers: {
        'content-type': 'application/json'
    }
}).then((res) => {
    res.json().then((objectData) => {
        data = []
        objectData.forEach((e) => {
            data.push([e.date, e.open, e.high, e.low, e.close, e.volume])
        })
        data.reverse()

        var dataTable = anychart.data.table();
        dataTable.addData(data);

        // map data
        var mapping = dataTable.mapAs({ 'open': 1, 'high': 2, 'low': 3, 'close': 4 });
        var valueMapping = dataTable.mapAs({ 'value': 5 });

        // set the chart type
        var chart = anychart.stock();

        // set the series
        var series = chart.plot(0).candlestick(mapping);

        var volumePlot = chart.plot(1);
        volumePlot.height('30%');
        volumePlot.yAxis().labels().format('{%Value}{scale:(1000)|(k)}');

        var volumeSeries = volumePlot.column(valueMapping);
        volumeSeries.name('Volume');

        series.fallingFill("red");
        series.fallingStroke("red");
        series.risingFill("green");
        series.risingStroke("green");

        series.name("EUR USD Trade Data");

        // set the chart title
        chart.title("EUR USD Historical Trade Data");

        // set the container id
        chart.container('container');

        // draw the chart
        chart.draw();
    })
});



