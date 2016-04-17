var babel = require('babel-standalone');

function load(src) {
  var text, error;
  var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
  xhr.open('GET', src, false);
  xhr.onreadystatechange = function(e) {
    if( this.readyState == 4 && this.status == 200 ) text = this.responseText;
    else error = this.responseText;
  };
  xhr.send();
  
  if( error ) throw new Error('Cannot find module \'' + src + '\': ' + error);
  text = text.split('//# sourceMappingURL=').join('//'); // TODO: validate sourcemap URL
  
  return text;
}

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
        if( typeof regexp === 'string' ) regexp = new RegExp(regexp);
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
  load: function(src, type) {
    if( !type ) {
      regexps.forEach(function(regexp) {
        if( src.match(regexp.regexp) ) type = regexp.type;
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
    var transform = babel.transform(load(src), { presets: ['es2015', 'stage-0'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  }, /\.es6?$/);
  
  Loader.add('es2015', function(src) {
    var transform = babel.transform(load(src), { presets: ['es2015'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  });
  
  Loader.add('jsx', function(src) {
    console.log('babel', babel);
    var transform = babel.transform(load(src), { presets: ['react'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  }, /\.jsx?$/);
  
  Loader.add('css', function(src) {
    var el = document.createElement('link');
    el.setAttribute('rel', 'stylesheet');
    el.setAttribute('type', 'text/css');
    el.setAttribute('href', src);
    document.head.appendChild(el);
  
    return {
      exports: el
    };
  }, /\.css?$/);
  
  Loader.add('html', function(src) {
    var doc, error;
    // check supports HTMLImports
    if( 'import' in document.createElement('link') ) {
      var el = document.createElement('link');
      el.setAttribute('rel', 'import');
      el.setAttribute('href', src);
      document.head.appendChild(el);
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
  }, /\.html?$/);
  
  Loader.add('less', function(src) {
    var el = document.createElement('link');
    el.setAttribute('rel', 'stylesheet/less');
    el.setAttribute('href', src);
    document.head.appendChild(el);
    
    require('less').registerStylesheets();
  
    return {
      exports: el
    };
  }, /\.less?$/);
  
  Loader.add('scss', function(src) {
    // TODO: scss
  }, /\.scss?$/);
  
  Loader.add('ts', function(src) {
    // TODO: typescript, compiler 용량이 너무 크다.3M.문제.
  }, /\.ts?$/);
  
  Loader.add('coffee', function(src) {
    // TODO: coffeescript
  }, /\.ts?$/);
})();


module.exports = {
  loader: Loader
};