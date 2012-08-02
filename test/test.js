var should = require('should'),
    fs = require('fs'),
    Alert = require('../lib/alert'),
    Common = require('../lib/common'),
    Project = require('../lib/project'),
    Task = require('../lib/task');
    
describe('common functions', function(){
  
  it('should get a userApps 1 and 2', function(done){
    Common.getUserApps(['1', '2'], function(err, userApps){
      userApps.length.should.equal(2);
      done();
    });
  });
  
  it('should get a user jeff.gorder@coordel.com', function(done){

    Common.getUser('jeff.gorder@coordel.com', function(err, user){
      user.length.should.equal(1);
      done();
    });
  });
  
  it('should get html to be used with plates', function(){
    
   Common.getHtml('alert/partials/property', 'html').should.equal('<p><strong id="label"></strong>: <span id="value"></span></p>');
    
  });
  

});

describe('project fields', function(){
 
  it('should return a purpose property', function(done){
    Project.getTemplate({change:{
      purpose: "Here is the purpose of this thing",
      users: ['1']},alert:{},username:'1'
    }, function(err, template){
      template.should.equal('<p><strong id="label">Purpose</strong>: <span id="value">Here is the purpose of this thing</span></p>');
      done();
    });
  });
  it('should return a deadline property', function(done){
    Project.getTemplate({change:{
      deadline: "2012-07-07T02:42:10.760Z",
      users: ['1']}, alert: {}, username:'1'
    }, function(err, template){
      template.should.equal('<p><strong id="label">Deadline</strong>: <span id="value">Friday, July 6th, 2012, 10:42:10 PM</span></p>');
      done();
    });
  });
  it('should return a responsible property', function(done){
    Project.getTemplate({change: {
      responsible: '1',
      users: ['1']},alert:{}, username:'1'
    }, function(err, template){
      template.should.equal('<p><strong id="label">Responsible</strong>: <span id="value">Jeff Gorder</span></p>');
      done();
    });
  });
  
  
  
  it('should return a starts property', function(done){
    Project.getTemplate({change:{
      users: ['1'],
      calendar: {
        start: "2012-07-31T00:00:00-04:00"
      }},alert:{},username:'1'
    }, function(err, template){
      template.should.equal('<p><strong id="label">Starts</strong>: <span id="value">Tuesday, July 31st, 2012, 12:00:00 AM</span></p>');
      done();
    });
  });
  
});



describe('alert functions', function(){
 it('should return false, no changes submitted', function(){
    Alert. getTemplate({username: '1'}, function(err, reply){
      if (err) throw err;
      reply.should.equal(false);
    });
  });
  
  it('should return false, username not submitted', function(){
    Alert. getTemplate({change: {}}, function(err, reply){
      if (err) throw err;
      reply.should.equal(false);
    });
  });

});


describe('task functions', function(){

  
  it('should get the task template', function(done){
    var options = {};
    options.change = get('task/update');
    options.alert = options.change.history.shift();
    Task.getTemplate(options, function(err, template){
   
      done();
    });
  });
  

});


/*

describe('getTemplate()', function(){
  describe('Malformed options', function(){
    it('should return false, no changes submitted', function(){
      Alert. getTemplate({username: '1'}, function(err, reply){
        if (err) throw err;
        reply.should.equal(false);
      });
    });
    
    it('should return false, username not submitted', function(){
      Alert. getTemplate({change: {}}, function(err, reply){
        if (err) throw err;
        reply.should.equal(false);
      });
    });
  });
  
  describe('POST', function(){
    var options = get('project/post');
    it('should get an ADDED e-mail template', function(done){  
      var out = get('project/post', 'out');
      Alert.getTemplate(options, function(err, reply){
        if (err) throw err;
        reply.from.should.equal(out.from);
        reply.to.should.equal(out.to);
        reply.html.should.equal(out.html);
        done();
      });
    });
    
    
    it('should get No Deadline', function(done){  
      var out = get('project/post.no_deadline', 'out');
      var no =  get('project/post');
      delete (no.change.deadline);
      Alert.getTemplate(no, function(err, reply){
        if (err) throw err;
        reply.from.should.equal(out.from);
        reply.to.should.equal(out.to);
        reply.html.should.equal(out.html);
        done();
      });
    });
    
    it('should get a template with no Purpose', function(done){  
      var out = get('project/post.no_purpose', 'out');
      var no =  get('project/post');
      delete (no.change.purpose);
      Alert.getTemplate(no, function(err, reply){
        if (err) throw err;
        reply.from.should.equal(out.from);
        reply.to.should.equal(out.to);
        reply.html.should.equal(out.html);
        done();
      });
    });
    
  });
  
  describe('INVITE', function(){
    var options = get('project/invite');
    it('should get an INVITED e-mail template', function(done){  
      var out = get('project/invite', 'out');
      Alert.getTemplate(options, function(err, reply){
        if (err) throw err;
        reply.from.should.equal(out.from);
        reply.to.should.equal(out.to);
        reply.html.should.equal(out.html);
        done();
      });
    });
    
    
    it('should get No Deadline', function(done){  
      var out = get('project/invite.no_deadline', 'out');
      var no =  get('project/invite');
      delete (no.change.deadline);
      Alert.getTemplate(no, function(err, reply){
        if (err) throw err;
        reply.from.should.equal(out.from);
        reply.to.should.equal(out.to);
        reply.html.should.equal(out.html);
        done();
      });
    });
    
    it('should get a template with no Purpose', function(done){  
      var out = get('project/invite.no_purpose', 'out');
      var no =  get('project/invite');
      delete (no.change.purpose);
      Alert.getTemplate(no, function(err, reply){
        if (err) throw err;
        reply.from.should.equal(out.from);
        reply.to.should.equal(out.to);
        reply.html.should.equal(out.html);
        done();
      });
    });
    
    
  });
  
  
  describe('ADDED', function(){
    it('should send an ADDED email', function(){
      var doc = get('project/post');
      Alert.handleChange({doc:doc});
    });
  });
  
  describe('INVITE', function(){
    it('should send an INVITE email', function(){
      var doc = get('project/invite');
      Alert.handleChange({doc:doc});
    });
  });
  
  describe('FOLLOW', function(){
    it('should send an FOLLOW email', function(){
      var doc = get('project/follow');
      Alert.handleChange({doc:doc});
    });
  });
  
  describe('DELEGATE', function(){
    it('should send a DELEGATE email', function(){
      var doc = get('task/delegate');
      Alert.handleChange({doc:doc});
    });
  });
  
  describe('JOIN', function(){
    it('should send a JOIN email', function(){
      var doc = get('project/join');
      Alert.handleChange({doc:doc});
    });
  });
  
  
});
    
*/
function get(name, ext) {
  if (!ext) ext = 'json';
  try {
    return JSON.parse(fs.readFileSync(
      __dirname + 
      '/fixtures/' + 
      name + '.' + ext
    ));
  } catch(e) {
    return null;
  }
};



