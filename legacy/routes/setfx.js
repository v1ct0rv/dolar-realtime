var express = require('express');
var router = express.Router();

/* GET setfx listing. */
router.get('/allStats', function(req, res, next) {
  res.jsonp(req.workerData.allStats);
});

router.get('/stats', function(req, res, next) {
  res.jsonp(req.workerData.stats);
});

module.exports = router;
