var runtime;

var loaders = {}, mimemap = {}, extensionmap = {};
var Loaders = {
  names: function() { 
    return Object.keys(loaders);
  },
  define: function(name, options) {
    if( !name ) throw new Error('[webmodules] missing loader name');
    if( !options ) throw new Error('[webmodules] missing loader options');
    if( !options ) throw new Error('[webmodules] missing options');
    if( typeof options.load !== 'function' ) throw new Error('[webmodules] options.load is must be a function');
    
    var loader = {
      name: name,
      options: options,
      load: options.load
    };
    var extensions = [];
    var mimeTypes = [];
    (options.extensions || []).forEach(function(extension) {
      if( extension[0] !== '.' ) extension = '.' + extension;
      extensionmap[extension] = loader;
      extensions.push(extension);
    });
    
    (options.mimeTypes || []).forEach(function(mime) {
      mimemap[mime] = loader;
      mimeTypes.push(mime);
    });
    
    loader.mimeTypes = mimeTypes;
    loader.extensions = extensions;
    loaders[name] = loader;
    
    return this;
  },
  get: function(type) {
    return loaders[type];
  },
  find: function(name) {
    return loaders[name] && loaders[name];
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

// define default loaders
(function() {
  Loaders.define('es2016', {
    extensions: ['.es7'],
    mimeTypes: ['text/es7', 'text/es2016'],
    load: function(src) {
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

  Loaders.define('es2015', {
    extensions: ['.es6'],
    mimeTypes: ['text/es6', 'text/es2015'],
    load: function(src) {
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

  Loaders.define('react', {
    extensions: ['.jsx'],
    mimeTypes: ['text/react', 'text/jsx'],
    load: function(src) {
      var transform = require('babel-standalone').transform(runtime.fs.readFileSync(src), {
        presets: ['es2015', 'stage-0', 'react'],
        sourceMaps: true
      });
      
      return {
        sourcemap: transform,
        code: transform.code
      };
    }
  });
  
  Loaders.define('css', {
    extensions: ['.css'],
    mimeTypes: ['text/css', 'text/stylesheet'],
    load: function(src) {
      var style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('data-src', src);
      // TODO: replace @import paths
      var css = runtime.fs.readFileSync(src);
      if (style.styleSheet) style.styleSheet.cssText = css;
      else style.innerHTML = css;
      
      if( document.head ) document.head.appendChild(style);
      else console.error('[webmodules] css loader, where does document.head go away?');
      
      return {
        exports: style
      };
    }
  });
  
  Loaders.define('html', {
    extensions: ['.html'],
    mimeTypes: ['text/html'],
    load: function(src) {
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
  
  Loaders.define('less', {
    extensions: ['.less'],
    mimeTypes: ['text/less'],
    load: function(src) {
      var less = require('less/lib/less-browser/index.js')(window, {});
      var options = {
        relativeUrls: true,
        filename: src.replace(/#.*$/, '')
      };
      
      var style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('data-src', src);
      
      less.render(runtime.fs.readFileSync(src), options).then(function(result) {
        if (style.styleSheet) style.styleSheet.cssText = result.css;
        else style.innerHTML = result.css;
      
        if( document.head ) document.head.appendChild(style);
        else console.error('[webmodules] less loader, where does document.head go away?');
      });
      
      return {
        exports: style
      };
    }
  });
  
  Loaders.define('coffee', {
    extensions: ['.coffee'],
    mimeTypes: ['text/coffee', 'text/coffee-script', 'text/coffeescript'],
    load: function(src) {
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
  
  Loaders.define('jquery', {
    mimeTypes: ['text/jquery'],
    load: function(src) {
      var script = runtime.fs.readFileSync(src);
      script = 'var jQuery = require("jquery");' + script;
      
      return {
        code: script
      };
    }
  });
})();


var minimatch = require('minimatch');

module.exports = {
  runtime: function(o) {
    if( !arguments.length ) return runtime;
    runtime = o;
  },
  match: function(src, pattern) {
    var b = minimatch(src, pattern, { matchBase: true });
    //console.info('match', src, pattern, b);
    return b;
  },
  loaders: Loaders
};