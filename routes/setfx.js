var express = require('express');
var request = require('request');
var router = express.Router();

/* GET setfx listing. */
router.get('/allStats', function(req, res, next) {
    var url = 'http://www.set-fx.com/json/allStats?timestamp=' + Date.now();
    request(url, function(error, response, html) {
        if (!error) {
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
            res.jsonp(data);
        } else {
            res.send(500, 'The url <strong>' + url + '</strong> cannot be contacted, error: <br/> <strong>' + error + '</strong>');
        }
    });
});

router.get('/stats', function(req, res, next) {
    var url = 'http://www.set-fx.com/json/stats?timestamp=' + Date.now();
    request(url, function(error, response, html) {
        if (!error) {
            var json = JSON.parse(html);
            res.jsonp(json);
        } else {
            res.send(500, 'The url <strong>' + url + '</strong> cannot be contacted, error: <br/> <strong>' + error + '</strong>');
        }
    });
});

module.exports = router;
