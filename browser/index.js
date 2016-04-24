var babel = require('babel-standalone');

var runtime;
var transpilers = {};
var regexps = [];
var Transpiler = {
  types: function() { 
    return Object.keys(transpilers);
  },
  add: function(type, loader, regexp) {
    transpilers[type] = loader;
    
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
    return transpilers[type];
  },
  exists: function(src) {
    var exists;
    regexps.forEach(function(regexp) {
      if( regexp.regexp.test(src) ) exists = true;
    });
    return exists;
  },
  transpile: function(src, type) {
    if( !type ) {
      regexps.forEach(function(regexp) {
        if( regexp.regexp.test(src) ) type = regexp.type;
      });
    }
    
    if( !type ) throw new Error('[webmodules] cannot find matched loader for src: ' + src);
    
    var loader = transpilers[type];
    if( !loader ) throw new Error('[webmodules] loader not exists:' + type);
    return loader(src);
  }
};

// bind default transpilers
(function() {
  Transpiler.add('es2016', function(src) {
    var transform = babel.transform(runtime.fs.readFileSync(src), { presets: ['es2015', 'stage-0'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  }, /\.es6$/);
  
  Transpiler.add('es2015', function(src) {
    var transform = babel.transform(runtime.fs.readFileSync(src), { presets: ['es2015'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  });
  
  Transpiler.add('jsx', function(src) {
    var transform = babel.transform(runtime.fs.readFileSync(src), { presets: ['es2015', 'react'], sourceMaps: true });
    return {
      sourcemap: transform,
      code: transform.code
    };
  }, /\.jsx$/);
  
  Transpiler.add('css', function(src) {
    var style = document.createElement('link');
    style.setAttribute('rel', 'stylesheet');
    style.setAttribute('type', 'text/css');
    // TODO: replace @import paths
    var css = runtime.fs.readFileSync(src);
    if (style.styleSheet) style.styleSheet.cssText = css;
    else style.innerHTML = css;
    
    if( document.head ) document.head.appendChild(style);
    else console.error('[webmodules] css transpiler, where does document.head go away?');
    
    return {
      exports: style
    };
  }, /\.css$/);
  
  Transpiler.add('html', function(src) {
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
  
  Transpiler.add('less', function(src) {
    var less = require('less/lib/less-browser/index.js')(window, {});
    var options = {
      filename: src.replace(/#.*$/, '')
    };
    
    var style = document.createElement('style');
    style.type = 'text/css';
      
    less.render(runtime.fs.readFileSync(src), options).then(function(result) {
      if (style.styleSheet) style.styleSheet.cssText = result.css;
      else style.innerHTML = result.css;
      
      if( document.head ) document.head.appendChild(style);
      else console.error('[webmodules] less transpiler, where does document.head go away?');
    });
    
    return {
      exports: style
    };
  }, /\.less$/);
  
  Transpiler.add('coffee', function(src) {
    //var coffee = require('coffee-script/lib/coffee-script/browser.js');
    var coffee = require('coffee-script');
    var compiled = coffee.compile(runtime.fs.readFileSync(src), {bare:true, header:true, sourceMap:true});
    
    return {
      code: compiled.js,
      sourcemap: compiled.v3SourceMap
    };
  }, /\.coffee$/);
  
  Transpiler.add('scss', function(src) {
    // TODO: scss
  }, /\.scss$/);
  
  Transpiler.add('ts', function(src) {
    // TODO: typescript, compiler 용량이 너무 크다.3M.문제.
  }, /\.ts$/);
})();


module.exports = {
  runtime: function(o) {
    runtime = o;
  },
  transpilers: Transpiler
};