var schemes = (function() {
  var default_scheme;
  var schememap = {};
  
  return {
    get: function(name) {
      return schememap[name];
    },
    add: function(name, resolver) {
      schememap[name] = resolver;
      return this;
    },
    default: function(name) {
      if( !arguments.length ) return default_scheme;
      default_scheme = name;
      return this;
    }
  };
})();

schemes.add('bower', require('./installer/bower.js'));
schemes.add('gitlab', require('./installer/npm.js'));
schemes.add('github', require('./installer/npm.js'));
schemes.add('gist', require('./installer/npm.js'));
schemes.add('bitbucket', require('./installer/npm.js'));
schemes.add('npm', require('./installer/npm.js'));
schemes.default('npm');

module.exports = schemes;