var nodemailer  = require('nodemailer'),
    settings    = require('./../config/index').settings("settings", "./config"),
    config      = settings.config.sendgridOptions,
    redisOpts   = settings.config.redisOptions,
    redis       = require('redis').createClient(redisOpts.port, redisOpts.host),
    fs          = require('fs'),
    Plates      = require('plates'),
    dateFormat  = require('dateformat'),
    winston     = require('winston'),
    Project     = require('./project'),
    Common      = require('./common'),
    Task        = require('./task');
    
redis.auth(redisOpts.auth);

var nls = JSON.parse(fs.readFileSync( __dirname +'/nls/nls-alert.json', 'utf8'));

exports.handleChange = function(change, fn){
  var map = getChangeAlertMap(change.doc),
      alerts = [];
  
  //console.log("change", change.doc.name, change.doc._id, map);
  
  //assemble the collection of alerts to send for this change
  for (var key in map){
    //console.log("key", key);
    
    //if this user didn't do the update, then alert when history exists
    if (change.doc.username !== "UNASSIGNED" && change.doc.updater !== key && change.doc.history && change.doc.history.length > 0){
      var alert = change.doc.history[0];
      //console.log("change updater = alert actor", (change.updater === alert.actor.id));
      alerts.push({
        username: key,
        change: change.doc,
        alert: alert
      });
  
    } else if (change.doc.docType === "message" && change.doc.updater !== key){
      alerts.push({
        username: key,
        change: change.doc
      });
    }
  }
  
  //get the template for each alert and send it
  if (alerts.length > 0){
    alerts.forEach(function(alert){
      getTemplate(alert, function(err, template){
        send(template);
      });
    });
  }
};

exports.getTemplate = function(options, fn){
  
  //options is an object that has a username:appId, change:object, and alert:object
  getTemplate(options, function(err, template){
    if (err) return fn(err, false);
    return fn(null, template);
  });
};

exports.sendTemplate = function(template){
  send(template);
};

function getTemplate(args, fn){
  
  //if no username or no change, then just return
  if (!args.username || !args.change){
    fn(null, false);
    return;
  }
  
 
  var username = args.username;
  var change = args.change;
  var alert = args.alert;
  
 
  var to = username,
      from = false;
  
  if (alert){
    from = alert.actor.id;
  } else {
    from = change.actor.id;
  }
  
  Common.getUserApps([from, to], function(err, userApps){
    if (err) fn(err, false);
    var fromApp,
        toApp;
    
    userApps.forEach(function(app){
      if (app.id === from){
        fromApp = app;
      } 
      if (app.id === to){
        toApp = app;
      }
    });
    
    //console.log("userApps", userApps);
    //now we need to get the user record for the recipient so we can determine whether or not to show
    //login or invite buttons;
    Common.getUser(toApp.email, function(err, user){
      //console.log("error", err);
      if (err) fn(err, false);
  
      toApp.invited = user.invited;
      
      
      getTemplateHtml({from: fromApp, to: toApp, change: change, alert: alert}, function(err, tempHtml){
        
        //console.log("templateHtml", tempHtml);
        
        //create the message template
        var template = {

            // sender info
            from: fromApp.firstName + ' ' + fromApp.lastName + ' <'+ fromApp.email+'>',

            // Comma separated list of recipients
            to: toApp.firstName + ' ' + toApp.lastName + ' <'+ toApp.email+'>',

            // Subject of the message
            subject: nls.verbs[alert.verb.toLowerCase()].verb.toUpperCase() + ': ' + change.name,

            // plaintext body
            text: 'Hello to myself!',

            // HTML body
            html: tempHtml
        };

        if (change._attachments){
          template.attachments = [];
          for (var f in change._attachments){
            template.attachments.push({
              fileName: f,
              filePath: 'http://' + settings.url + '/coordel/files/' + change._id + '/' + f,
              cid: (new Date().getTime())
            });
          }
        }
        return fn (null, template);
      });
    });   
  });
}




function getMainHtml(args, fn){
  
  var change = args.change;
  var alert = args.alert;
  
  //based on type of change, get the data to send to the render for the main message
  if (alert){
    var data = {};
    //it's an alert
    switch (change.docType){
      
      case ('project'):
        data.sender = alert.actor.name;
        data.time = dateFormat(new Date(alert.time), 'dddd, mmmm dS, yyyy, h:MM:ss TT');
        data.projectName = change.name;
        Project.getTemplate(args, function(err, template){
          if (err) return fn(err, false);
          data.project = template;
          var html = Common.render(Common.getHtml('alert/'+ change.docType + '/' + alert.verb.toLowerCase(),'html'), data);
          return fn(null, html);
        });
      break;
     
      case ('task'):
        data.sender = alert.actor.name;
        data.time = dateFormat(new Date(alert.time), 'dddd, mmmm dS, yyyy, h:MM:ss TT');
        data.projectName = alert.target.name;
        data.taskName = change.name;
        
        //if this is add or remove blocking, need to get the info from the alert's body
        if (alert.verb === "ADD-BLOCKING" || alert.verb === "REMOVE-BLOCKING"){
          var body = JSON.parse(alert.body);
          data.blockedTaskName = body.task;
          data.blockedProjectName = body.project;
        }
        
        Task.getTemplate(args, function(err, template){
          data.task = template;
          var html = Common.render(Common.getHtml('alert/'+ change.docType + '/' + alert.verb.toLowerCase(),'html'), data);
          return fn(null, html);
        });
      break;
    }
  } else {
    //it's a message
    fn(null, {});
  }
}

function getTemplateHtml(args, fn){
  //this function assembles the full template html for the alert
  var from = args.from;
  var to = args.to;
  var change = args.change;
  var alert = args.alert;
  
  
  if (alert){
    getMainHtml({change: change, alert: alert}, function(err, mainHtml){
      if (err) return fn(err, false);
      //console.log("mainHtml", mainHtml);
      var tempData = {
        mainMessage: mainHtml,
        button: getButtonHtml(from, to, change, alert),
        feature: getFeatureHtml(alert.verb.toLowerCase())
      };
      
      
      return fn(null, Common.render(Common.getHtml('alert','html'), tempData));
    });
    
  } else {
    fn(null, "");
  } 
  
}

function getFeatureHtml(verb){
  //var features = nls.verbs[verb.toLowerCase()].features;
  var features = [];
  var tips = [];
  //randomize the features for updates
  
  var f1 = Math.floor((Math.random()*11)+1);
  var f2;
  do
    {
    f2 = Math.floor((Math.random()*11)+1);
    }
  while (f1 === f2);
  
  features.push('p' + f1.toString());
  features.push('p' + f2.toString());
  
  
  features.forEach(function(f){
    var source = nls.features.productivity[f];
    var tip = {};
    tip.feature = source.feature;
    tip.featureHeadline = source.headline;
    tip.featureDescription = source.description;
    tips.push(tip);
  });
  
  
  return Common.render(Common.getHtml('feature','html'),{tips: tips});
}


function getButtonHtml(from, to, change, alert){
  //assemble the button message. if this is a new user that hasn't accepted the invite, they will be directed to the
  //redeem invite link. if the user has redeemed the invite, they will get a login link
  var buttonData = {};
  var bnName;
  var buttonMap = Plates.Map();
  if (to.invited){
    //buttonMap.where('id').is('link').use('link to redeem invite').as('href');
    buttonData.linkUrl = 'http://'+ settings.url + '/invite/'+to.id;
    
    bnName = 'sign-up';
  } else {
    //buttonMap.where('id').is('link').use('link to login').as('href');
     buttonData.linkUrl = 'http://' + settings.url + '/login';
     bnName = 'sign-on';
  }
  
  buttonMap.where('href').is('link').insert('linkUrl');
  
  return Common.render(Common.getHtml(bnName,'html'), buttonData, buttonMap);
};




function send(message){
  // Create a Sendmail transport object
  var transport = nodemailer.createTransport("SMTP", {
          host: config.host,
          port : config.port,
          domain: config.domain,
          authentication: 'login',
          auth: {
              user: config.username,
              pass: config.password
          } 
      });

  winston.info('Sending e-mail alert');
  
  transport.sendMail(message, function(error){
      if(error){
          console.log('Error occured');
          console.log(error.message);
          return;
      }
      winston.info('E-mail message sent successfully!');
  });
  
}

function getChangeAlertMap(change){
  var map = {},
      doc = change;

	  if (doc.docType == "project"){
	  //if the project substatus isn't PENDING, then only the responsible gets the project
	  if (!doc.substatus || doc.substatus !== "PENDING"){
	    //this isn't pending so notify everyone with an assignment
	    doc.assignments.forEach(function(assign){
	      
	      //notify everyone who didn't decline or leave the project
	      if (assign.status !== "LEFT" && assign.status !== "LEFT-ACK"){
	        if (!map[assign.username]) map[assign.username] = true;
	      }
  		});
	  }

	  //this is a pending project so only the responsible gets the channge
	  if (doc.substatus === "PENDING"){
	    if (!map[doc.responsible]) map[doc.responsible] = true;
	  }
	}

	if (doc.docType === "role"){
	  //everyone with a responsbility in this role gets notified
	  if (doc.responsibilities){
	    doc.responsibilities.forEach(function(resp){
  		  if (!map[resp.username]) map[resp.username] = true;
  		});
	  }
	  if (!map[doc.responsible]) map[doc.responsible] = true;
	}

	//users get the tasks when they own them and they aren't pending, declined, or left (set to unassigned)
	if(doc.docType == "task" && doc.status !== "PENDING" && doc.substatus !== "DECLINED" && doc.substatus !=="UNASSIGNED") {
	   if (!map[doc.username]) map[doc.username] = true;
	} 
	
	//responsible gets notified of changes to tasks
	if(doc.docType == "task") {
	  if (doc.history && doc.history.length){
	    var alert = doc.history[0];
  	  if (alert.verb !== "SAVE"){
  	    //the responsible doesn't need to get notified when the user saves the workspace
  	    if (!map[doc.responsible]) map[doc.responsible] = true;
  	  }
	  }
	}

	//only the responsible gets notified of pending tasks
	if (doc.docType === "task" && doc.status === "PENDING"){
	  if (!map[doc.responsible]) map[doc.responsible] = true;
	}

	//make sure the responsible gets gets declined tasks notifications
	if (doc.docType === "task" && doc.substatus === "DECLINED"){
	  if (!map[doc.responsible]) map[doc.responsible] = true;
	}

	//the responsible needs the change to know the issue was raised
	if(doc.docType == "task" && doc.substatus == "ISSUE") {
		if (!map[doc.responsible]) map[doc.responsible] = true;
	}
	
	//the responsible needs to get the change to know the issue was cleared 
	if(doc.docType == "task" && doc.substatus == "CLEARED") {
		if (!map[doc.responsible]) map[doc.responsible] = true;
	}
	
	//the responsible needs change to know the task was submitted 
	if(doc.docType == "task" && doc.status == "CURRENT" && doc.substatus == "DONE") {
		if (!map[doc.responsible]) map[doc.responsible] = true;
	}
	
	//the responsible needs change to know the task was returned 
	if(doc.docType == "task" && doc.substatus == "RETURNED") {
		if (!map[doc.responsible]) map[doc.responsible] = true;
	}
	
	//the responsible needs change to get the done notification
	if(doc.docType == "task" && doc.substatus == "APPROVED") {
		if (!map[doc.responsible]) map[doc.responsible] = true;
	}
	
	if (doc.docType == "message"){
	  //notify all users that a message has been received
		for (var u in doc.users){
		  if (!map[doc.users[u]]) map[doc.users[u]] = true;
		}
	}
	
	//notify about new templates
	if (doc.docType == "template" && doc.username){
	  //notify the user that a template is available
		if (!map[doc.username]) map[doc.username] = true;
	}
	
	if (doc.docType == "file" && doc._attachments != undefined){
    if (!map[doc.updater]) map[doc.updater] = true;
	}

	if (doc.docType == "prerequisite"){
	   if (!map[doc.username]) map[doc.username] = true;
	}
	
	return map;
}