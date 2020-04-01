var request = require('request');
var _ = require('underscore');

var worker =  {
  data: {
    oilStats: {},
    stats: {},
    allStats: {}
  },

  updateBrentOil: function() {
    var timerTitle = 'Updating BrentOil';
    console.time(timerTitle);

    var options = {
      url: 'http://es.investing.com/common/modules/js_instrument_chart/api/data.php?symbol=Petr%25C3%25B3leo%2BBrent&pair_id=8833&pair_id_for_news=8833&chart_type=area&pair_interval=300&candle_count=120&events=yes&volume_series=yes',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)',
        'Referer': 'http://es.investing.com/commodities/brent-oil',
        'X-Requested-With': 'XMLHttpRequest'
      }
    };

    request(options, function(error, response, html) {
      if (!error) {
        try {
          var data = JSON.parse(html);

          // Sort the data to avoid http://www.highcharts.com/errors/15
          if(data.candles) {
            data.candles = _.sortBy(data.candles, function(arr) { return arr[0]; });
          }

          if(data.events && data.events.news) {
            data.events.news = _.sortBy(data.events.news, function(o) { return o.x; });
          }

          worker.data.oilStats = data;
        } catch (error) {
          console.error('Error on request: ' + options.url + ', error trying to parse: ' + html);
          console.error(error);
        }

      } else {
        console.error("Error on request: " + options.url + "Error: " + error);
      }
    });

    console.timeEnd(timerTitle);
  },

  updateStats: function() {
    var timerTitle = 'Updating Stats';
    console.time(timerTitle);
    var url = 'http://www.setfx.com.co/json/stats?timestamp=' + Date.now();
    request(url, function(error, response, html) {
      if (!error) {
        try {
          var json = JSON.parse(html);
          worker.data.stats = json;
        } catch (error) {
          console.error('Error on request: ' + url + ', error trying to parse: ' + html);
          console.error(error);
        }
      } else {
        console.error("Error on request: " + url + "Error: " + error);
      }
      console.timeEnd(timerTitle);
    });
  },

  updateAllStats: function() {
    var timerTitle = 'Updating All Stats';
    console.time(timerTitle);
    var url = 'http://www.setfx.com.co/json/allStats?timestamp=' + Date.now();
    request(url, function(error, response, html) {
      if (!error) {
        try {
          var data = {
            monto: [],
            precio: []
          };
          var json = JSON.parse(html);
          json.forEach(function (element, index, array) {
            element= JSON.parse(element)
            data.precio.push([element.t, parseFloat(element.p)]);
            data.monto.push([element.t, element.m]);
          });
          //console.log(json);
          worker.data.allStats = data;
        } catch (error) {
          console.error('Error on request: ' + url + ', error trying to parse: ' + html);
          console.error(error);
        }
      } else {
        console.error("Error on request: " + url + "Error: " + error);
      }
      console.timeEnd(timerTitle);
    });
  }
};

module.exports = worker;
