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

app.router.get('demo/:id', function(){
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