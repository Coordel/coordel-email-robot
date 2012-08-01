/**
 * This module takes change objects of docType task and returns the template required
 *
 */
 
var Common = require('./common'),
    fs = require('fs'),
    nls = JSON.parse(fs.readFileSync( __dirname +'/nls/nls-alert.json', 'utf8'));
 
exports.getTemplate = function(args, fn){
  var template = '';
  var change = args.change;
  var alert = args.alert;
  
  var userList = [change.responsible, change.username];
  if (change.delegator){
    userList.push(change.delegator);
  }
  
  //first get all the users in the project
  Common.getUserApps(userList, function(err, users){
    
    //load any blocking or blockers
    getBlockData(change, function(err, blockData){
      console.log("block data", blockData);
      //if there is a body on the alert then the user gave a message or there is a change
      if (alert.body){
        var body = alert.body;

        if (alert.verb === "UPDATE"){
          var chgTemplate = "";
          body = JSON.parse(alert.body);
          body.changes.forEach(function(change){
            chgTemplate += getChangeHtml(change);
          });
          template += chgTemplate;
          template += Common.getHtml('alert/partials/update/task-header','html');
        } else if (alert.verb === 'RAISE-ISSUE'){
          var issue = {};
          body = JSON.parse(alert.body);
          issue.issue = Common.lineBreak(body.raiseIssue.issue);
          issue.labelIssue = nls.issue;
          issue.solution = Common.lineBreak(body.raiseIssue.solution);
          issue.labelSolution = nls.solution;
          template += Common.render(Common.getHtml('alert/partials/raise-issue', 'html'), issue);
        } else if (alert.verb === 'CLEAR-ISSUE'){
          var res = {};
          res.label = nls.resolution;
          res.value = Common.lineBreak(body);
          template += Common.render(Common.getHtml('alert/partials/clear-issue', 'html'), res);
        } else if (alert.verb === "PROPOSE-CHANGE"){
          var pc = {};
          pc.label = nls.proposal;
          pc.value = Common.lineBreak(body);
          template += Common.render(Common.getHtml('alert/partials/propose-change', 'html'), pc);
        } else if (alert.verb === "AGREE-CHANGE"){
          var ac = {};
          ac.label = nls.agreement;
          ac.value = Common.lineBreak(body);
          template += Common.render(Common.getHtml('alert/partials/agree-change', 'html'), ac);
        } else if (alert.verb === "DEFER"){
          var d = {};
          d.label = nls.taskDetails.starts;
          d.value = Common.lineBreak(body);
          template += Common.render(Common.getHtml('alert/partials/message', 'html'), d);
        } else if (alert.verb === "ADD-BLOCKING"){
          var ab = {};
          ab.label = nls.addBlocking;
          ab.value = Common.lineBreak(body);
          template += Common.render(Common.getHtml('alert/partials/add-blocking', 'html'), ab);
        } else if (alert.verb === "REMOVE-BLOCKING"){
          var rb = {};
          rb.label = nls.removeBlocking;
          rb.value = Common.lineBreak(body);
          template += Common.render(Common.getHtml('alert/partials/remove-blocking', 'html'), rb);
        } else {
          var msg = {};
          msg.label = nls.message;
          msg.value = Common.lineBreak(body);
          template += Common.render(Common.getHtml('alert/partials/message', 'html'), msg);
        }
      }

      
      if (change.name){
        template += Common.getProperty(nls.name, change.name);
      }
    

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

      if (change.delegator && change.responsible !== change.delegator){
        var del = users.filter(function(user){
          return user.id === change.delegator;
        });
        if (del.length){
          del = del[0];
          template += Common.getProperty(nls.by, del.firstName + " " + del.lastName);
        }
      }

      if (change.calendar && change.calendar.start){
        template += Common.getProperty(nls.deferred, Common.prettyDate(change.calendar.start, 'dddd, mmmm dS, yyyy'));
      }

      if (blockData.blocking){
        //console.log("make a blocking entry", blockData.blocking);
        var a = {};
        a.label = nls.blocking;
        blockData.blocking.forEach(function(item){
          item.projectName = blockData[item.project].name;
        });
        a.blocking = blockData.blocking;
        var aHtml = Common.getHtml('alert/task/blocking', 'html');
        template += Common.render(aHtml, a);
      }

      if (blockData.blockers){
        //console.log("make a blockers entry", blockData.blockers);
        var b = {};
        b.label = nls.blockers;
        blockData.blockers.forEach(function(item){
          item.projectName = blockData[item.project].name;
        });
        b.blockers = blockData.blockers;
        var bHtml = Common.getHtml('alert/task/blockers', 'html');
        template += Common.render(bHtml, b);
      }

      if (change.workspace && change.workspace.length > 0){
        var data = {};
        data.label = nls.deliverables;
        data.deliverables = change.workspace;
        var html = Common.getHtml('alert/task/workspace', 'html');
        template += Common.render(html, data);
      }

      if (alert.body){
        switch (alert.verb){
          case "UNFOLLOW":
            template += '<br/>';
            template += Common.getProperty(nls.reason, alert.body);
          break;
        }
      }

      return fn(null, template);
    });
    
    
    
  });

};


function getChangeHtml(chg){
  var data = {},
      html = "";
      
  chg = getValue(chg);
  
  //removed
  if (chg.prev && !chg.value){
    html = 'alert/partials/update/removed';
    data.action = nls.removed + " "+ chg.field.toUpperCase();
    data.previousLabel = nls.previousValue;
    data.previous = chg.prev;
    data.removeDeadline = '';
    console.log("field", chg.field);
    if (chg.field === "deadline"){
      data.removeDeadline = nls.removedDeadline;
    }
  }
  //changed 
  if (chg.prev && chg.value){
    html = 'alert/partials/update/changed';
    data.action = nls.changed + " "+chg.field.toUpperCase();
    data.valueLabel = nls.newValue;
    data.value = chg.value;
    data.previousLabel = nls.previousValue;
    data.previous = chg.prev;
  }
  //added
  if (!chg.prev && chg.value){
    html = 'alert/partials/update/added';
    data.action = nls.added + " "+chg.field.toUpperCase();
    data.newLabel = nls.newValue;
    data.value = chg.value;
  }
  
  var template = Common.render(Common.getHtml(html, 'html'), data);
  
  
  return template;
  
}

function getBlockData(change, fn){
  //this function checks if this change is blocking or has blockers and if either,
  //bundles them up into a data packet to return
  var get = [],
      map = {};
  if (change.blocking){
    change.blocking.forEach(function(id){
      get.push(id);
      map[id] = 'blocking';
    });
  }
  if (change.coordinates){
    change.coordinates.forEach(function(id){
      get.push(id);
      map[id] = 'blocker';
    });
  }
  if (get.length > 0){
    Common.get(get, function(err, rows){

      var data = {};
      var projects = [];
      rows.forEach(function(row){
        data.hasData = true;
        //track the users and projects
        if (!map[row.project]){
          map[row.project] = true;
          projects.push(row.project);
        }
        if (map[row._id] === 'blocking'){
          if (!data.blocking){
            data.blocking = [];
          }
          data.blocking.push(row);
        } else if (map[row._id] === 'blocker'){
          if (!data.blockers){
            data.blockers = [];
          }
          data.blockers.push(row);
        }
      });
      
      if (data.hasData){
        
        Common.get(projects, function(err, rows){
          rows.forEach(function(row){
            if (!data[row._id]){
              data[row._id] = row;
            }
          });
          return fn(null, data);
        });
        
      } 
      
    });
  } else {
    fn(null, {});
  }
}

function getValue(chg){
  switch (chg.field){
    case 'purpose':
      if (chg.prev){
        chg.prev = Common.lineBreak(chg.prev);
      }
      if (chg.value){
        chg.value = Common.lineBreak(chg.value);
      }
    break;
  }
  return chg;
}
