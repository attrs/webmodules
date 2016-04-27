var runtime;

var transpilers = {}, mimemap = {}, extensionmap = {};
var Transpiler = {
  names: function() { 
    return Object.keys(transpilers);
  },
  define: function(name, options) {
    if( !name ) throw new Error('[webmodules] missing transpiler name');
    if( !options ) throw new Error('[webmodules] missing transpiler options');
    if( !options ) throw new Error('[webmodules] missing options');
    if( typeof options.transpile !== 'function' ) throw new Error('[webmodules] options.transpile is must be a function');
    
    var transpiler = {
      name: name,
      options: options,
      transpile: options.transpile
    };
    var extensions = [];
    var mimeTypes = [];
    (options.extensions || []).forEach(function(extension) {
      if( extension[0] !== '.' ) extension = '.' + extension;
      extensionmap[extension] = transpiler;
      extensions.push(extension);
    });
    
    (options.mimeTypes || []).forEach(function(mime) {
      mimemap[mime] = transpiler;
      mimeTypes.push(mime);
    });
    
    transpiler.mimeTypes = mimeTypes;
    transpiler.extensions = extensions;
    transpilers[name] = transpiler;
    
    return this;
  },
  get: function(type) {
    return transpilers[type];
  },
  find: function(name) {
    return transpilers[name] && transpilers[name];
  },
  findByExtension: function(extension) {
    return extensionmap[extension] && extensionmap[extension];
  },
  findByMimeType: function(mime) {
    return mimemap[mime] && mimemap[mime];
  },
  mimeTypes: function() {
    return Object.keys(mimemap);
  },
  extensions: function() {
    return Object.keys(extensionmap);
  }
};

// define default transpilers
(function() {
  Transpiler.define('es2016', {
    extensions: ['.es7'],
    mimeTypes: ['text/es7', 'text/es2016'],
    transpile: function(src) {
      var transform = require('babel-standalone').transform(runtime.fs.readFileSync(src), {
        presets: ['es2015', 'stage-0'],
        sourceMaps: true
      });
      
      return {
        sourcemap: transform,
        code: transform.code
      };
    }
  });

  Transpiler.define('es2015', {
    extensions: ['.es6'],
    mimeTypes: ['text/es6', 'text/es2015'],
    transpile: function(src) {
      var transform = require('babel-standalone').transform(runtime.fs.readFileSync(src), {
        presets: ['es2015'],
        sourceMaps: true
      });
      
      return {
        sourcemap: transform,
        code: transform.code
      };
    }
  });

  Transpiler.define('react', {
    extensions: ['.jsx'],
    mimeTypes: ['text/react', 'text/jsx'],
    transpile: function(src) {
      var transform = require('babel-standalone').transform(runtime.fs.readFileSync(src), {
        presets: ['es2015', 'react'],
        sourceMaps: true
      });
      
      return {
        sourcemap: transform,
        code: transform.code
      };
    }
  });
  
  Transpiler.define('css', {
    extensions: ['.css'],
    mimeTypes: ['text/css', 'text/stylesheet'],
    transpile: function(src) {
      var style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('data-src', src);
      // TODO: replace @import paths
      var css = runtime.fs.readFileSync(src);
      if (style.styleSheet) style.styleSheet.cssText = css;
      else style.innerHTML = css;
      
      if( document.head ) document.head.appendChild(style);
      else console.error('[webmodules] css transpiler, where does document.head go away?');
      
      return {
        exports: style
      };
    }
  });
  
  Transpiler.define('html', {
    extensions: ['.html'],
    mimeTypes: ['text/html'],
    transpile: function(src) {
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
      }
    }
  });
  
  Transpiler.define('less', {
    extensions: ['.less'],
    mimeTypes: ['text/less'],
    transpile: function(src) {
      var less = require('less/lib/less-browser/index.js')(window, {});
      var options = {
        filename: src.replace(/#.*$/, '')
      };
      
      var style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('data-src', src);
      
      less.render(runtime.fs.readFileSync(src), options).then(function(result) {
        if (style.styleSheet) style.styleSheet.cssText = result.css;
        else style.innerHTML = result.css;
      
        if( document.head ) document.head.appendChild(style);
        else console.error('[webmodules] less transpiler, where does document.head go away?');
      });
      
      return {
        exports: style
      };
    }
  });
  
  Transpiler.define('coffee', {
    extensions: ['.coffee'],
    mimeTypes: ['text/coffee', 'text/coffee-script', 'text/coffeescript'],
    transpile: function(src) {
      var coffee = require('coffee-script');
      var compiled = coffee.compile(runtime.fs.readFileSync(src), {
        bare:true,
        header:true,
        sourceMap:true
      });
      
      return {
        code: compiled.js,
        sourcemap: compiled.v3SourceMap
      };
    }
  });
})();

module.exports = {
  runtime: function(o) {
    if( !arguments.length ) return runtime;
    runtime = o;
  },
  transpilers: Transpiler
};