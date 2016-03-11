function loadData(url, callback) {
    $.ajax({
        dataType: 'json',
        type: 'GET',
        url: url
    }).done(callback).fail(function(jqXHR, textStatus, errorThrown) {
        var err = textStatus + ", " + errorThrown;
        console.log("Request Failed: " + err);
        debugger;
        var data = jqXHR.responseText;
        alert(data);
    });
}

function loadAllStats(callback) {
    loadData('/setfx/allStats?callback=?', callback);
}

function loadStats(callback) {
    loadData('/setfx/stats?callback=?', callback);
}

function updateData(isUpdate) {
    loadAllStats(function(data, textStatus, jqXHR) {
        if (isUpdate) {
            $('#container').highcharts().series[0].setData(data.monto);
            $('#container').highcharts().series[1].setData(data.precio);
        } else {
            loadChart(data);
        }
    });

    loadStats(function(data, textStatus, jqXHR) {
        Object.keys(data).forEach(function(key) {
            if (!isIconIndicator(key)) {
                $("#" + key).text(data[key]);
            } else {
                $("#" + key).attr('class', '');
                if (data[key].toLowerCase() == 'up') {
                    $("#" + key).attr('class', 'glyphicon glyphicon-chevron-up');
                } else if (data[key].toLowerCase() == 'down') {
                    $("#" + key).attr('class', 'glyphicon glyphicon-chevron-down');
                } else {
                    $("#" + key).attr('class', 'glyphicon glyphicon-arrow-right');
                }
            }
        });
    });
}

function isIconIndicator(key) {
    switch (key) {
        case 'priceChange':
        case 'avgPriceChange':
        case 'trmPriceChange':
        case 'openPriceChange':
        case 'minPriceChange':
        case 'maxPriceChange':
            return true;
    }

    return false;
}

function loadChart(data) {
    $('#container').highcharts({
        chart: {
            zoomType: 'xy'
        },
        title: {
            text: 'Dólar Spot'
        },
        subtitle: {
            text: 'Fuente: http://www.set-fx.com/'
        },
        xAxis: {
            title: {
                enabled: true,
                text: 'Hours of the Day'
            },
            type: 'datetime',
            dateTimeLabelFormats: {
                hour: '%H:%M'
            },
            //tickInterval: 900 * 1000 // quince minutes
        },
        yAxis: [{
            labels: { // Primary yAxis
                format: '{value}',
                style: {
                    color: Highcharts.getOptions().colors[1]
                }
            },
            title: {
                text: 'Precio',
                style: {
                    color: Highcharts.getOptions().colors[1]
                }
            },
            opposite: true
                //max: 3250
        }, { // Secondary yAxis
            title: {
                text: 'Monto (Miles UDS)',
                style: {
                    color: Highcharts.getOptions().colors[0]
                }
            },
            labels: {
                format: '{value}',
                style: {
                    color: Highcharts.getOptions().colors[0]
                }
            }
            //max: 5000000
        }],
        tooltip: {
            shared: true
        },
        legend: {
            layout: 'vertical',
            align: 'left',
            x: 120,
            verticalAlign: 'top',
            y: 100,
            floating: true,
            backgroundColor: (Highcharts.theme && Highcharts.theme.legendBackgroundColor) || '#FFFFFF'
        },
        series: [{
            name: 'Monto',
            type: 'column',
            yAxis: 1,
            data: data.monto,
            tooltip: {
                valuePrefix: 'USD$'
            },
            //pointInterval: 900 * 1000 // quince minutes
        }, {
            name: 'Precio',
            type: 'spline',
            data: data.precio,
            tooltip: {
                valuePrefix: '$'
            },
            //pointInterval: 900 * 1000 // quince minutes
        }]
    });
}

$(function() {

    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    updateData(false);

    // Update Data every 10 seconds
    setTimeout(function() {
        updateData(true);
    }, 10000);


    // the button action
    $('#button').click(function() {
        loadAllStats(function(data, textStatus, jqXHR) {
            $('#container').highcharts().series[0].setData(data.monto);
            $('#container').highcharts().series[1].setData(data.precio);
        });
    });
});