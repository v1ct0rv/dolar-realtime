var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var users = require('./routes/users');
var setfx = require('./routes/setfx');
var investing = require('./routes/investing');
var worker = require('./worker');
var schedule = require('node-schedule');
var proxy = require("express-http-proxy");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var commonData = function (req, res, next) {
  req.workerData = worker.data
  next()
}
app.use(commonData)

app.use('/', routes);
app.use('/users', users);
app.use('/setfx', setfx);
app.use('/investing', investing);
// proxying requests from /analytics to www.google-analytics.com.
function getIpFromReq (req) { // get the client's IP address
    var bareIP = ":" + ((req.connection.socket && req.connection.socket.remoteAddress)
        || req.headers["x-forwarded-for"] || req.connection.remoteAddress || "");
    return (bareIP.match(/:([^:]+)$/) || [])[1] || "127.0.0.1";
}

app.use("/analytics", proxy("https://www.google-analytics.com", {
  proxyReqPathResolver: function (req) {
    return req.url + (req.url.indexOf("?") === -1 ? "?" : "&")
        + "uip=" + encodeURIComponent(getIpFromReq(req));
  }
}));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Run Jobs
//worker.updateBrentOil();
worker.updateStats();
worker.updateAllStats();

// Schedule Jobs
//var o = schedule.scheduleJob('*/30 * * * * *', worker.updateBrentOil);
var s = schedule.scheduleJob('*/20 * * * * *', worker.updateStats);
var a = schedule.scheduleJob('*/20 * * * * *', worker.updateAllStats);


module.exports = app;
