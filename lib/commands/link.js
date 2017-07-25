var path = require('path');

module.exports = function link(options, done) {
  var cwd = options.cwd || process.cwd();
  var rcfile = path.join(cwd, '.webmodulesrc');
  
  try {
    var rc = fs.existsSync(rcfile) ? JSON.parse(fs.readFileSync(rcfile)) : {};
    var dir = path.resolve(options.dir);
    var name = options.name || path.basename(dir);
  
    var links = rc.links = rc.links || {};
    links[name] = dir;
    
    fs.writeFileSync(rcfile, JSON.stringify(rc, null, '  '), 'utf8');
    done(null, {
      dir: dir,
      name: name
    });
  } catch(err) {
    done(err);
  }
};