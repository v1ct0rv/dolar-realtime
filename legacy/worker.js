var request = require('request');
var _ = require('lodash');
const axios = require('axios');



const headers = {
  "Content-Type": "application/json",
  Accept: "application/json, text/plain, */*",
  Origin: "https://dolar.set-icap.com",
  Referer: "https://dolar.set-icap.com/",
  "User-Agent": "Mozilla/5.0 (compatible; dolar-realtime/2.0)",
};

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
    let currentDate = new Date();
    let dateformatted = currentDate.toISOString().split("T")[0];
    console.time(timerTitle);

    try {
      var url =
        "https://proxy.set-icap.com/seticap/api/estadisticas/estadisticasPrecioMercado/";
      const [
        estadisticasPrecioMercado,
        estadisticasPromedioCierre,
        estadisticasMontoMercado,
      ] = await Promise.all([
        axios.post(
          "https://proxy.set-icap.com/seticap/api/estadisticas/estadisticasPrecioMercado/",
          { fecha: dateformatted, mercado: 71, delay: 15 },
          { headers: headers }
        ),
        axios.post(
          "https://proxy.set-icap.com/seticap/api/estadisticas/estadisticasPromedioCierre/",
          { fecha: dateformatted, mercado: 71, delay: 15 },
          { headers: headers }
        ),
        axios.post(
          "https://proxy.set-icap.com/seticap/api/estadisticas/estadisticasMontoMercado/",
          { fecha: dateformatted, mercado: 71, delay: 15 },
          { headers: headers }
        ),
      ]);

      var data = {};
      // Fill Data
      data.trm = estadisticasPrecioMercado.data.data.trm;
      data.trmPriceChange =
        estadisticasPrecioMercado.data.data.trmchange.toLowerCase();
      data.maxPrice = estadisticasPrecioMercado.data.data.high;
      data.maxPriceChange =
        estadisticasPrecioMercado.data.data.highchange.toLowerCase();
      data.minPrice = estadisticasPrecioMercado.data.data.low;
      data.minPriceChange =
        estadisticasPrecioMercado.data.data.lowchange.toLowerCase();
      data.openPrice = estadisticasPrecioMercado.data.data.open;
      data.openPriceChange =
        estadisticasPrecioMercado.data.data.openchange.toLowerCase();

      data.price = estadisticasPromedioCierre.data.data.close;
      data.avgPrice = estadisticasPromedioCierre.data.data.avg;

      data.totalAmmount = estadisticasMontoMercado.data.data.sum;
      data.latestAmmount = estadisticasMontoMercado.data.data.open;
      data.avgAmmount = estadisticasMontoMercado.data.data.avg;
      data.minAmmount = estadisticasMontoMercado.data.data.low;
      data.maxAmmount = estadisticasMontoMercado.data.data.high;
      data.transactions = estadisticasMontoMercado.data.data.count;

      worker.data.stats = data;
    } catch (error) {
      console.error("Error on request: " + url);
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
    let currentDate = new Date();
    let dateformatted = currentDate.toISOString().split("T")[0];
    var url = "https://proxy.set-icap.com/seticap/api/graficos/graficoMoneda/";
    try {
      const response = await axios.post(
        url,
        { fecha: dateformatted, moneda: 1, delay: "15" },
        { headers }
      );

      var data = { monto: [], precio: [] };
      var json = response.data;

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
      console.error("Error on request: " + url);
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
