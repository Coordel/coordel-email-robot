var nconf = require('nconf');
var path = require('path');
var _ = require('underscore');

var settings = exports.settings = createConfiguration;

function detectEnvironment() {
  // if supplied with an environment, simply use that
  if (process.env.NODE_ENV) return process.env.NODE_ENV;
  // Otherwise, we're in the development environment
  return 'development';
}

function getConfiguration(type, currentEnvironment) {
   var defaults = nconf.stores.production.store;
   if (currentEnvironment === 'development'){
     var overrides = nconf.stores.development.store;
     _.extend(defaults, overrides);
   }
   return defaults;
}

function createConfiguration(type, configDir) {
  
  var paths = Object.create(null);
    // 'eg config/settings.defaults.json'
    paths.defaults = path.join(configDir, type + '.defaults.json');
    // 'eg' ./settings.json
    paths.overrides = path.join(process.cwd(), type + '.json');
  
  nconf.add('production', {
    type: 'memory',
    loadFrom: [paths.defaults]
  });
  
  nconf.add('development', {
    type: 'memory',
    loadFrom: [paths.overrides]
  });
  
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = detectEnvironment();
  }
  return getConfiguration(type, process.env.NODE_ENV);
}
