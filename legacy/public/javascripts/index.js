function loadData(url, callback) {
    $.ajax({
        dataType: 'json',
        type: 'GET',
        url: url
    }).done(callback).fail(function(jqXHR, textStatus, errorThrown) {
        var err = textStatus + ", " + errorThrown;
        console.log("Request Failed: " + err);
    });
}

function loadAllStats(callback) {
    loadData('/setfx/allStats?callback=?', callback);
}

function loadStats(callback) {
    loadData('/setfx/stats?callback=?', callback);
}

function loadBrentOil(callback) {
    loadData('/investing/brentOil?callback=?', callback);
}

function updateData(isUpdate) {
    // track page refresh
    gtag('event', 'updateData', {
        'app_name': 'dolaRealtime',
        'screen_name': 'Home'
    });
    loadAllStats(function(data, textStatus, jqXHR) {
        if (isUpdate) {
            $('#container').highcharts().series[0].setData(data.monto);
            $('#container').highcharts().series[1].setData(data.precio);
        } else {
            loadDolarChart(data);
        }
    });

    loadBrentOil(function(data, textStatus, jqXHR) {

        if(data.attr) {
            $("#oilData").show()
            // Set Data
            $("#cierreOil").text(data.attr.last_close_value);
            $("#priceOil").text(data.attr.last_value);

            // Show difference
            var difference = parseFloat(data.attr.last_value-data.attr.last_close_value).toFixed(2);
            if (difference > 0) {
                $("#priceOilChange").text(' +' + difference);
                $("#priceOilChange").attr('class', 'bg-success');
            } else {
                $("#priceOilChange").text(difference);
                $("#priceOilChange").attr('class', 'bg-danger');
            }

            // Show variation: the change against the previous close
            var variation = parseFloat((data.attr.last_value/data.attr.last_close_value-1)*100).toFixed(2);
            if (variation > 0) {
                $("#priceOilVariation").text('   (+' + variation + '%)');
                $("#priceOilVariation").attr('class', 'bg-success');
            } else {
                $("#priceOilVariation").text('   (' + variation + '%)');
                $("#priceOilVariation").attr('class', 'bg-danger');
            }
        } else {
            $("#oilData").hide()
        }

        // Set Chart: a refresh updates the line and its flags; a chart that was
        // never drawn (no data on the first load) is created instead.
        var brentChart = $('#container-brent').highcharts();
        if (isUpdate && brentChart && hasCandles(data)) {
            // An answer without prices hides the chart; bring it back and let it
            // take its size again, or it stays hidden until the page is reloaded.
            $('#container-brent').show();
            brentChart.reflow();
            brentChart.series[0].setData(data.candles);
            brentChart.series[1].setData(data.events.news);
        } else {
            loadBrentChart(data);
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

function loadDolarChart(data) {
    $("#container").highcharts({
      chart: {
        zoomType: "x",
      },
      title: {
        text: "Dólar Spot",
      },
      subtitle: {
        text: "Fuente: https://dolar.icap.com.co/",
      },
      xAxis: {
        title: {
          enabled: true,
          text: "Hours of the Day",
        },
        type: "datetime",
        dateTimeLabelFormats: {
          hour: "%H:%M",
        },
        //tickInterval: 900 * 1000 // quince minutes
      },
      yAxis: [
        {
          labels: {
            // Primary yAxis
            format: "{value}",
            style: {
              color: Highcharts.getOptions().colors[1],
            },
          },
          title: {
            text: "Precio",
            style: {
              color: Highcharts.getOptions().colors[1],
            },
          },
          opposite: true,
          //max: 3250
        },
        {
          // Secondary yAxis
          title: {
            text: "Monto (Miles UDS)",
            style: {
              color: Highcharts.getOptions().colors[0],
            },
          },
          labels: {
            format: "{value}",
            style: {
              color: Highcharts.getOptions().colors[0],
            },
          },
          //max: 5000000
        },
      ],
      tooltip: {
        shared: true,
      },
      legend: {
        layout: "vertical",
        align: "left",
        x: 120,
        verticalAlign: "top",
        y: 100,
        floating: true,
        backgroundColor:
          (Highcharts.theme && Highcharts.theme.legendBackgroundColor) ||
          "#FFFFFF",
      },
      series: [
        {
          name: "Monto",
          type: "column",
          yAxis: 1,
          data: data.monto,
          tooltip: {
            valuePrefix: "USD$",
          },
          //pointInterval: 900 * 1000 // quince minutes
        },
        {
          name: "Precio",
          type: "spline",
          data: data.precio,
          tooltip: {
            valuePrefix: "$",
          },
          //pointInterval: 900 * 1000 // quince minutes
        },
      ],
    });
}

// True once the oil data has at least one price point.
function hasCandles(data) {
    return !!(data.candles && data.candles.length);
}

function loadBrentChart(data) {
    if(!hasCandles(data)){
        $('#container-brent').hide()
    } else {
        $('#container-brent').show()
        $('#container-brent').highcharts({
            chart: {
                zoomType: 'x'
            },
            // Oil timestamps are real instants (the dollar chart's are wall-clock
            // times), so the zone has to be named for the axis to read in Colombian time.
            time: {
                timezone: 'America/Bogota'
            },
            title: {
                text: 'Petróleo Brent'
            },
            subtitle: {
                text: 'Fuente: Yahoo Finance (BZ=F) · Noticias: Google News'
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
            plotOptions: {
                area: {
                    fillColor: {
                        linearGradient: {
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: 1
                        },
                        stops: [
                            [0, Highcharts.getOptions().colors[0]],
                            // Highcharts.color(), not Highcharts.Color(): the page loads the latest
                            // Highstock, where Color is a class and calling it without `new` throws.
                            [1, Highcharts.color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
                        ]
                    },
                    marker: {
                        radius: 2
                    },
                    lineWidth: 1,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                }
            },
            series: [{
                name: 'Precio',
                type: 'area',
                id : 'dataseries',
                data: data.candles,
                tooltip: {
                    valuePrefix: '$'
                }
                //pointInterval: 900 * 1000 // quince minutes
            }, {
                name: 'Eventos',
                type : 'flags',
                data : data.events.news,
                zIndex: 10,
                onSeries : 'dataseries',
                shape : 'circlepin',
                width : 16
            }],
            tooltip: {
                useHTML: true,
                // Let the pointer reach the tooltip, so the headline's link can be clicked.
                stickOnContact: true,
                style: { pointerEvents: 'auto' }
            }
        });
    }
}

$(function() {

    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    // Highcharts strips attributes it does not know from tooltip HTML. The oil
    // headlines open in a new tab and keep their rel="noopener noreferrer".
    // Guarded: the page takes whatever Highstock the CDN serves, and a nicety for
    // the oil links must never be what stops the dollar chart below.
    if (Highcharts.AST && Highcharts.AST.allowedAttributes) {
        Highcharts.AST.allowedAttributes.push('rel');
    }

    updateData(false);

    // Update Data every 10 seconds
    setInterval(function() {
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
