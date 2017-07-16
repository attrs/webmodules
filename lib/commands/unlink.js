var fs = require('fs');
var path = require('path');

module.exports = function link(options, done) {
  var cwd = options.cwd || process.cwd();
  var rcfile = path.join(cwd, '.webmodulesrc');
  
  if( !fs.existsSync(rcfile) ) return done();
  
  try {
    var rc = JSON.parse(fs.readFileSync(rcfile));
    var name = options.name;
    
    if( !rc.links || !rc.links[name] ) return done();
    
    delete rc.links[name];
    
    fs.writeFileSync(rcfile, JSON.stringify(rc, null, '  '), 'utf8');
    done(null, {
      name: name
    });
  } catch(err) {
    done(err);
  }
};