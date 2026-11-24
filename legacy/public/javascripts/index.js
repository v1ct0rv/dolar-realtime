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
        // A chart that was never drawn (the first load failed) is created instead of updated.
        var dollarChart = $('#container').highcharts();
        if (isUpdate && dollarChart) {
            dollarChart.series[0].setData(data.monto);
            dollarChart.series[1].setData(data.precio);
            applyOpeningPrice(dollarChart, data);
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

// The dollar's price is green above the day's opening price and red below it, as on
// SET-ICAP's own chart. (Highcharts' second palette colour, which the price used to
// take, is green only in its dark theme.)
var PRICE_COLOR = "#16a34a";
var BELOW_OPEN_COLOR = "#dc2626";
var DOLLAR_SOURCE = "Fuente: dolar.set-icap.com";

function loadDolarChart(data) {
    $("#container").highcharts({
      chart: {
        zoomType: "x",
      },
      // The timestamps are real instants. Without a zone Highcharts draws them in UTC:
      // 1:00 PM to 6:00 PM for a market that trades 8:00 to 13:00.
      time: {
        timezone: "America/Bogota",
      },
      title: {
        text: "Dólar Spot",
      },
      subtitle: {
        text: DOLLAR_SOURCE,
      },
      xAxis: {
        title: {
          enabled: true,
          text: "Hora (Colombia)",
        },
        type: "datetime",
        dateTimeLabelFormats: {
          minute: "%H:%M",
          hour: "%H:%M",
        },
        crosshair: true,
        //tickInterval: 900 * 1000 // quince minutes
      },
      yAxis: [
        {
          labels: {
            // Primary yAxis
            format: "{value}",
            style: {
              color: PRICE_COLOR,
            },
          },
          title: {
            text: "Precio (COP)",
            style: {
              color: PRICE_COLOR,
            },
          },
          opposite: true,
          //max: 3250
        },
        {
          // Secondary yAxis
          title: {
            text: "Monto (miles USD)",
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
        xDateFormat: "%H:%M:%S",
      },
      // The legend is Highcharts' default, under the plot. It used to float over the
      // price line in a white box.
      series: [
        {
          name: "Monto",
          type: "column",
          yAxis: 1,
          data: data.monto,
          // Fainter than the price, which is what the chart is read for.
          opacity: 0.55,
          tooltip: {
            valuePrefix: "USD$",
          },
          //pointInterval: 900 * 1000 // quince minutes
        },
        {
          name: "Precio",
          // An area, so the stretch between the price and its opening level can be filled.
          type: "area",
          data: data.precio,
          color: PRICE_COLOR,
          lineWidth: 1.5,
          fillOpacity: 0.12,
          threshold: null,
          tooltip: {
            valuePrefix: "$",
          },
          //pointInterval: 900 * 1000 // quince minutes
        },
      ],
    });

    applyOpeningPrice($("#container").highcharts(), data);
}

// Colours the price against the day's opening price, as SET-ICAP's own chart does:
// red below it, a dotted line at it, and the fill running between the two. It is
// called on every refresh and acts only when the level changes, which is on the
// first load and on a page left open into the next day.
function applyOpeningPrice(chart, data) {
    var open = chartHelpers.openingPrice(data.precio);
    if (!chart || chart.openingPrice === open) return;
    chart.openingPrice = open;

    var price = chart.series[1];
    chart.yAxis[0].removePlotLine("open");

    if (open === null) {
        price.update({ threshold: null, zones: [] }, false);
        chart.setTitle(null, { text: DOLLAR_SOURCE }, false);
    } else {
        // The second zone has no colour of its own: above the level the series keeps its.
        price.update({ threshold: open, zones: [{ value: open, color: BELOW_OPEN_COLOR }, {}] }, false);
        chart.yAxis[0].addPlotLine({
            id: "open", value: open, dashStyle: "Dot", width: 1, color: "#666666", zIndex: 3,
        });
        // Named here and not on the line: the price starts at this level and keeps crossing it.
        chart.setTitle(null, {
            text: DOLLAR_SOURCE + " · Línea punteada: apertura " + Highcharts.numberFormat(open, 2, ".", ",") +
                " · Rojo: por debajo de la apertura",
        }, false);
    }

    chart.redraw();
}

// Farther apart than this, two points are not the same moment: oil at 03:00 has no
// counterpart on a dollar chart that opens at 08:00.
var LINK_MAX_GAP_MS = 10 * 60 * 1000;

// The point of `series` nearest in time to `time`, within `maxGapMs`, if there is one.
function pointNear(series, time, maxGapMs) {
    var times = series.points.map(function(point) { return point.x; });
    return series.points[chartHelpers.nearestIndexByTime(times, time, maxGapMs)];
}

// Shows on `chart` the moment `time`: the tooltip and the crosshair at its price
// point nearest in time. With no such point, or with `time` null (the pointer left
// the other chart), both are hidden. A chart that is not there is ignored.
function showMoment(chart, time) {
    if (!chart) return;

    // Both charts name the series that marks time "Precio".
    var price = chart.series.filter(function(series) { return series.name === 'Precio'; })[0];
    var point = price && time !== null ? pointNear(price, time, LINK_MAX_GAP_MS) : undefined;

    if (!point) {
        chart.tooltip.hide(0);
        chart.xAxis[0].hideCrosshair();
        return;
    }

    // A shared tooltip (the dollar's) lists every series' point at that same time.
    var shown = chart.tooltip.shared
        ? chart.series.map(function(series) { return pointNear(series, point.x, 0); }).filter(Boolean)
        : point;
    chart.tooltip.refresh(shown);
    chart.xAxis[0].drawCrosshair(null, point);
}

// Hovering the chart in `source` shows the same moment on the chart in `target`.
// The listeners sit on the containers, which are always there; the charts are
// looked up on each event, since either can be missing or be drawn again.
function linkCharts(source, target) {
    var container = $(source)[0];

    ['mousemove', 'touchmove', 'touchstart'].forEach(function(type) {
        container.addEventListener(type, function(event) {
            var chart = $(source).highcharts();
            if (!chart) return;
            var time = chart.xAxis[0].toValue(chart.pointer.normalize(event).chartX);
            showMoment($(target).highcharts(), time);
        });
    });

    container.addEventListener('mouseleave', function() {
        showMoment($(target).highcharts(), null);
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
                    text: 'Hora (Colombia)'
                },
                type: 'datetime',
                dateTimeLabelFormats: {
                    minute: '%H:%M',
                    hour: '%H:%M'
                },
                crosshair: true,
                //tickInterval: 900 * 1000 // quince minutes
            },
            yAxis: [{
                labels: { // Primary yAxis
                    format: '{value}',
                    style: {
                        color: Highcharts.getOptions().colors[0]
                    }
                },
                title: {
                    text: 'Precio',
                    style: {
                        color: Highcharts.getOptions().colors[0]
                    }
                },
                opposite: true
                    //max: 3250
            }],
            tooltip: {
                shared: true
            },
            // The legend is Highcharts' default, under the plot, as on the dollar chart.
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
                xDateFormat: '%H:%M',
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

    linkCharts('#container', '#container-brent');
    linkCharts('#container-brent', '#container');

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
