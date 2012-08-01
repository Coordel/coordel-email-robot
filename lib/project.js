/**
 * This module takes change objects of docType project and returns the data required
 *
 */
 
var Common = require('./common'),
    fs = require('fs'),
    nls = JSON.parse(fs.readFileSync( __dirname +'/nls/nls-alert.json', 'utf8'));
 
exports.getTemplate = function(args, fn){
  var template = '';
  var change = args.change;
  var alert = args.alert;
  
  //first get all the users in the project
  Common.getUserApps(change.users, function(err, users){
    if (alert.body){
      var body = alert.body;
      var msg = {};
      if (alert.verb === "UNFOLLOW"){
        msg.label = nls.reason;
      } else {
        msg.label = nls.message;
      }
      msg.value = Common.lineBreak(body);
      template += Common.render(Common.getHtml('alert/partials/message-project', 'html'), msg);
    }
    
    /*
    if (change.name){
      template += Common.getProperty(nls.name, change.name);
    }
    */
    
    if (change.purpose){
      change.purpose = Common.lineBreak(change.purpose);
      template += Common.getProperty(nls.purpose, change.purpose);
    }

    if (change.deadline){
      if (change.deadline.split('T').length > 1){
        change.deadline = Common.prettyDate(change.deadline);
      } else {
        change.deadline = Common.prettyDate(change.deadline, 'dddd, mmmm dS, yyyy');
      }
      template += Common.getProperty(nls.deadline, change.deadline);
    }
    
    if (change.responsible){
      var resp = users.filter(function(user){
        return user.id === change.responsible;
      });
      if (resp.length){
        resp = resp[0];
        template += Common.getProperty(nls.responsible, resp.firstName + " " + resp.lastName);
      } 
    }
    
    if (change.users && change.users.length > 1){
      var data = {};
      data.label = nls.people;
      data.users = users;
      var html = Common.getHtml('alert/project/users', 'html');
      template += Common.render(html, data);
    }
    
    if (change.calendar && change.calendar.start){
      template += Common.getProperty(nls.deferred, Common.prettyDate(change.calendar.start));
    }
    
    return fn(null, template);
    
  });

};
