/**
 * This module provides common functions required by the robot
 *
 */
 
var settings    = require('./../config/index').settings("settings", "./config"),
    config      = settings.config.sendgridOptions,
    redisOpts   = settings.config.redisOptions,
    redis       = require('redis').createClient(redisOpts.port, redisOpts.host),
    couchOpts   = settings.config.couchOptions,
    couchName   = settings.config.couchName,
    cradle      = require('cradle').setup(couchOpts),
    cn          = new cradle.Connection(),
    couch       = cn.database(couchName),
    fs          = require('fs'),
    Plates      = require('plates'),
    dateFormat  = require('dateformat');
    
redis.auth(redisOpts.auth);
 
exports.getUserApps = function(users, fn){
  var multi = redis.multi();

  users.forEach(function(u){
     multi.hgetall('coordelapp:' + u);
  });

  multi.exec(function(err, reply){
    if (err) return fn(err, false);
    return fn(null, reply);
  });
};

exports.getUser = function(email, fn){
  //console.log("email", email);
  var multi = redis.multi();
  multi.hgetall('user:' + email);
  multi.exec(function(err, user){
    //console.log("user", user);
    if (err) return fn(err, false);
    return fn(null, user);
  });
};

exports.get = function(args, fn){
  couch.get(args, function(err, rows){
    if (err) return fn(err, false);
    return fn(null, rows);
  });
};


exports.getHtml = function (name, extension){

  try {
    return fs.readFileSync(
      __dirname + 
      '/templates/' + 
      name + '.' + 
      extension
    ).toString();
  } catch(e) {
    return null;
  }
};

exports.render = function(html, data, map) {
  if (!map){
    map = Plates.Map();
  }
  return Plates.bind(html, data, map);
};

exports.getProperty = function(label, value){
  var html = this.getHtml('alert/partials/property', 'html');
  return this.render(html, {label: label, value: value});
};

exports.unsubscribe = function(id, fn){
  var multi = redis.multi(),
      key = 'coordelapp:' + id;
  
  multi.hset(key, 'suppressEmail', true);
  multi.exec(function(err, reply){
    console.log("unsubscribe", reply);
    if (err) return fn(err, false);
    return fn(null, reply);
  });
};

exports.subscribe = function(id, fn){
  var multi = redis.multi(),
      key = 'coordelapp:' + id;
  
  multi.hdel(key, 'suppressEmail');
  multi.exec(function(err, reply){
    console.log("subscribe", err, reply);
    if (err) return fn(err, false);
    return fn(null, reply);
  });
};


exports.prettyDate = function(date, mask){
  if (!mask){
    mask = 'dddd, mmmm dS, yyyy, h:MM:ss TT';
  }
  return dateFormat(new Date(date), mask);
};

exports.lineBreak = function(string){
  //replaces line breaks with a br tag to keep space between paragraphs in text
  return string.replace(/\n/g, "<br>");
};


