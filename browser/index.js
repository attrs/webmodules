var babel = require('babel-standalone');

var runtime;
var loaders = {};
var regexps = [];
var Loader = {
  types: function() { 
    return Object.keys(loaders);
  },
  add: function(type, loader, regexp) {
    loaders[type] = loader;
    
    if( regexp ) {
      if( !Array.isArray(regexp) ) regexp = [regexp];
      regexp.forEach(function(regexp) {
        if( typeof regexp === 'string' ) regexp = new RegExp(regexp, 'g');
        if( !(regexp instanceof RegExp) ) return console.error('[webmodules] loader.add error: invalid regexp: ' + regexp);
        regexps.push({
          regexp: regexp,
          type: type
        });
      });
    }
    return this;
  },
  get: function(type) {
    return loaders[type];
  },
  exists: function(src) {
    var exists;
    regexps.forEach(function(regexp) {
      if( regexp.regexp.test(src) ) exists = true;
    });
    return exists;
  },
  load: function(src, type) {
    if( !type ) {
      regexps.forEach(function(regexp) {
        if( regexp.regexp.test(src) ) type = regexp.type;
      });
    }
    
    if( !type ) throw new Error('[webmodules] cannot find matched loader for src: ' + src);
    
    var loader = loaders[type];
    if( !loader ) throw new Error('[webmodules] loader not exists:' + type);
    return loader(src);
  }
};

// bind default loaders
(function() {
  Loader.add('es2016', function(src) {
    var transform = babel.transform(runtime.fs.load(src), { presets: ['es2015', 'stage-0'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  }, /\.es6$/);
  
  Loader.add('es2015', function(src) {
    var transform = babel.transform(runtime.fs.load(src), { presets: ['es2015'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  });
  
  Loader.add('jsx', function(src) {
    var transform = babel.transform(runtime.fs.load(src), { presets: ['es2015', 'react'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  }, /\.jsx$/);
  
  Loader.add('css', function(src) {
    var el = document.createElement('link');
    el.setAttribute('rel', 'stylesheet');
    el.setAttribute('type', 'text/css');
    el.setAttribute('href', src);
    document.head.appendChild(el);
  
    return {
      exports: el
    };
  }, /\.css$/);
  
  Loader.add('html', function(src) {
    var doc, error;
    // check supports HTMLImports
    if( 'import' in document.createElement('link') ) {
      var link = document.createElement('link');
      link.rel = 'import';
      link.href = src;
      link.onload = function(e) {
        doc = link.import;
      };
      link.onerror = function(e) {
        console.error('html import error', e);
        error = e;
      };
      document.head.appendChild(link);
    } else {
      require('x-include').import(src, function(err, doc) {
        if( err ) return console.error('[webmodules] html imports error', err);
      });
    }
  
    return {
      exports: function(done) {
        if( typeof done !== 'function' ) done = function() {};
        if( error ) return done(error);
        done(null, doc);
      }
    };
  }, /\.html$/);
  
  Loader.add('less', function(src) {
    var el = document.createElement('link');
    el.setAttribute('rel', 'stylesheet/less');
    el.setAttribute('href', src);
    document.head.appendChild(el);
    
    require('less').registerStylesheets();
  
    return {
      exports: el
    };
  }, /\.less$/);
  
  Loader.add('scss', function(src) {
    // TODO: scss
  }, /\.scss$/);
  
  Loader.add('ts', function(src) {
    // TODO: typescript, compiler 용량이 너무 크다.3M.문제.
  }, /\.ts$/);
  
  Loader.add('coffee', function(src) {
    // TODO: coffeescript
  }, /\.coffee$/);
})();


module.exports = {
  runtime: function(o) {
    runtime = o;
  },
  loader: Loader
};