var flatiron = require('flatiron'),
    app = flatiron.app,
    ecstatic = require('ecstatic');
var settings    = require('./config/index').settings("settings", "./config"),
    couchOpts   = settings.config.couchOptions,
    couchName   = settings.config.couchName,
    cradle      = require('cradle').setup(couchOpts),
    cn          = new cradle.Connection(),
    couch       = cn.database(couchName),
    follow      = require('follow'),
    Alert       = require('./lib/alert'),
    Common      = require('./lib/common'),
    fs          = require('fs'),
    path        = require('path'),
    Plates      = require('plates');

app.use(flatiron.plugins.http, {
  // HTTP options
});

app.http.before = [
	ecstatic(__dirname + '/public')
];

//
// app.router is now available. app[HTTP-VERB] is also available
// as a shortcut for creating routes

app.router.get('unsubscribe/:id', function(){
  //console.log('req', path.basename(this.req.url));
  var res = this.res;
  var id = path.basename(this.req.url);
  Common.unsubscribe(id, function(err, reply){
    Common.getUserApps([id], function(err, app){
      //console.log('userApp', app);
      
      var map = Plates.Map();
      map.where('href').is('/').insert('newurl');
      var data = {newurl: 'http://'+settings.url + '/subscribe/'+ id };
      //console.log("subscribe data", data);
      var html = Common.render(Common.getHtml('unsubscribe-success','html'), data, map);
      res.write(html);
      res.end();
    });
    
    
  });
});

app.router.get('subscribe/:id', function(){
  //console.log('req', path.basename(this.req.url));
  var res = this.res;
  var id = path.basename(this.req.url);
  Common.subscribe(id, function(err, reply){
    Common.getUserApps([id], function(err, app){
      var html = Common.render(Common.getHtml('subscribe-success','html'),{});
      res.write(html); 
      res.end();
    });
  });
});

app.router.get('/features', function() {
  var features = [];
  var tips = [];
  var nls = JSON.parse(fs.readFileSync( __dirname +'/lib/nls/nls-alert.json', 'utf8'));
  //randomize the features for updates
  for (var key in nls.features.productivity) {
    var source = nls.features.productivity[key];
    var tip = {};
    tip.feature = source.feature;
    tip.featureHeadline = source.headline;
    tip.featureDescription = source.description;
    tips.push(tip);
  };
  
  this.res.writeHead(200, { 'Content-Type': 'text/html' });
  var list = Common.render(Common.getHtml('feature','html'),{tips: tips});
  var html = Common.render(Common.getHtml('feature-list','html'), {features: list});
  this.res.write(html);
  this.res.end();
});

//Get the the update sequence of the dbase and start following changes
couch.info(function(err, info){
  if (err){
    console.log(logId, "ERROR getting update sequence when starting to monitor couch changes: " + JSON.stringify(err));
  } else {
    var since = info.update_seq;
    //start the changes stream using the latest sequence
    var dbUrl = 'http://'+ couchOpts.host + ':' + couchOpts.port + '/' + settings.config.couchName;
    //console.log("URL", dbUrl);
    follow({db:dbUrl, since: since, include_docs:true}, function(error, change) {
      if(!error) {
        Alert.handleChange(change);
      }
    });
  }
});




app.start(8090);