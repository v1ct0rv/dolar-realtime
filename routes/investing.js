var express = require('express');
var router = express.Router();

/* GET brentOil listing from http://es.investing.com/commodities/brent-oil. */
router.get('/brentOil', function(req, res, next) {
  res.jsonp(req.workerData.oilStats);
});

module.exports = router;
