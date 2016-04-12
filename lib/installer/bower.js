var bower = require('bower');

module.exports = {
  install: function(pkgs, options, done) {
    bower.commands
    .install(pkgs, options, { interactive: true })
    .on('error', function(err) {
      done(err);
    })
    .on('end', function (installed) {
      done(null, installed);
    });
  },
  uninstall: function(pkgs, options, done) {
    bower.commands
    .uninstall(pkgs, options, { interactive: true })
    .on('error', function(err) {
      done(err);
    })
    .on('end', function (installed) {
      done(null, installed);
    });
  }
};