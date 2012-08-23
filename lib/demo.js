var settings    = require('./../config/index').settings("settings", "./config"),
    config      = settings.config.sendgridOptions,
    redisOpts   = settings.config.redisOptions,
    redis       = require('redis').createClient(redisOpts.port, redisOpts.host),
    fs          = require('fs'),
    Plates      = require('plates'),
    dateFormat  = require('dateformat'),
    winston     = require('winston'),
    Common      = require('./common');
    
redis.auth(redisOpts.auth);

var nls = JSON.parse(fs.readFileSync( __dirname +'/nls/nls-alert.json', 'utf8'));

exports.handleChange = function(change, fn){
  
  
};



