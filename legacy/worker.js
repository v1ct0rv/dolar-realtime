var request = require('request');
var _ = require('lodash');
const axios = require('axios');



// ICAP's public snapshot: one unauthenticated response carrying what used to be
// four endpoints, as messages keyed by id. It always describes the current day.
const SNAPSHOT_URL =
  "https://proxy.set-icap.com/api/v1/ws/public/delay/snapshot?market=71";

// Fetches the snapshot and returns a lookup of its messages by id.
async function fetchSnapshot() {
  const response = await axios.get(SNAPSHOT_URL);
  const messages = response.data.messages || [];

  return function (id) {
    const message = messages.find((m) => m.id === id);
    if (!message) throw new Error("ICAP snapshot has no message " + id);
    return message;
  };
}

var worker = {
  data: {
    oilStats: {},
    stats: {},
    allStats: {},
  },

  updateBrentOil: function () {
    var timerTitle = "Updating BrentOil";
    console.time(timerTitle);

    // TODO use this api instead: https://api.investing.com/api/financialdata/8833/historical/chart/?interval=PT15M&pointscount=120
    var options = {
      url: "http://es.investing.com/common/modules/js_instrument_chart/api/data.php?symbol=Petr%25C3%25B3leo%2BBrent&pair_id=8833&pair_id_for_news=8833&chart_type=area&pair_interval=300&candle_count=120&events=yes&volume_series=yes",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1; Trident/5.0)",
        Referer: "http://es.investing.com/commodities/brent-oil",
        "X-Requested-With": "XMLHttpRequest",
      },
    };

    request(options, function (error, response, html) {
      if (!error) {
        try {
          var data = JSON.parse(html);

          // Sort the data to avoid http://www.highcharts.com/errors/15
          if (data.candles) {
            data.candles = _.sortBy(data.candles, function (arr) {
              return arr[0];
            });
          }

          if (data.events && data.events.news) {
            data.events.news = _.sortBy(data.events.news, function (o) {
              return o.x;
            });
          }

          worker.data.oilStats = data;
        } catch (error) {
          console.error(
            "Error on request: " +
              options.url +
              ", error trying to parse: " +
              html
          );
          console.error(error);
        }
      } else {
        console.error("Error on request: " + options.url + "Error: " + error);
      }
    });

    console.timeEnd(timerTitle);
  },

  updateStats: async function () {
    var timerTitle = "Updating Stats";
    console.time(timerTitle);

    try {
      const message = await fetchSnapshot();
      const precioMercado = message(1006).data;
      const promedioCierre = message(1007).data;
      const montoMercado = message(1005).data;

      var data = {};
      // Fill Data
      data.trm = precioMercado.trm;
      data.trmPriceChange = precioMercado.trmchange.toLowerCase();
      data.maxPrice = precioMercado.high;
      data.maxPriceChange = precioMercado.highchange.toLowerCase();
      data.minPrice = precioMercado.low;
      data.minPriceChange = precioMercado.lowchange.toLowerCase();
      data.openPrice = precioMercado.open;
      data.openPriceChange = precioMercado.openchange.toLowerCase();

      data.price = promedioCierre.close;
      data.avgPrice = promedioCierre.avg;

      data.totalAmmount = montoMercado.sum;
      data.latestAmmount = montoMercado.open;
      data.avgAmmount = montoMercado.avg;
      data.minAmmount = montoMercado.low;
      data.maxAmmount = montoMercado.high;
      data.transactions = montoMercado.count;

      worker.data.stats = data;
    } catch (error) {
      console.error("Error on request: " + SNAPSHOT_URL);
      console.error(error);
    }

    // request.post(url, function(error, response, html) {
    //   if (!error) {
    //     try {
    //       var json = JSON.parse(html);

    //       var data = json.data;

    //       // Backwards compatibility changes
    //       data.trmPriceChange = data.trmchange.toLowerCase()
    //       data.maxPrice = data.high;
    //       data.maxPriceChange = data.highchange.toLowerCase()
    //       data.minPrice = data.low;
    //       data.minPriceChange = data.lowchange.toLowerCase()
    //       data.openPrice = data.open;
    //       data.openPriceChange = data.openchange.toLowerCase()

    //       worker.data.stats = data;
    //     } catch (error) {
    //       console.error('Error on request: ' + url + ', error trying to parse: ' + html);
    //       console.error(error);
    //     }
    //   } else {
    //     console.error("Error on request: " + url + "Error: " + error);
    //   }
    // });
    console.timeEnd(timerTitle);
  },

  updateAllStats: async function () {
    var timerTitle = "Updating All Stats";
    console.time(timerTitle);
    try {
      const message = await fetchSnapshot();

      var data = { monto: [], precio: [] };
      var json = message(1000);

      var correctJson = json.result[0].datos_grafico_moneda_mercado
        .replace(/'/g, '"')
        .replace(/\d{2}:\d{2}(:\d{2})*/gi, function (e) {
          return '"' + e + '"';
        })
        .replace(/data:/g, '"data":')
        .replace(/label:/g, '"label":')
        .replace(/type:/g, '"type":')
        .replace(/labels:/g, '"labels":')
        .replace(/datasets:/g, '"datasets":');
      var remoteData = JSON.parse("{" + correctJson + "}").data;

      data.precio = remoteData.datasets[0].data.map((precio, index) => [
        getDateFromHours(remoteData.labels[index]).getTime(),
        precio,
      ]);
      data.monto = remoteData.datasets[1].data.map((monto, index) => [
        getDateFromHours(remoteData.labels[index]).getTime(),
        monto,
      ]);

      worker.data.allStats = data;
    } catch (error) {
      console.error("Error on request: " + SNAPSHOT_URL);
      console.error(error);
    }
    console.timeEnd(timerTitle);
  },
};


function getDateFromHours(time) {
    time = time.split(':');
    let now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...time);
}

module.exports = worker;
