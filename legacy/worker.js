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
