var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Información del Dólar Interbancario en Tiempo Real' });
});

module.exports = router;
