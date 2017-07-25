var runtime;

// define bundle loaders
function init() {
  runtime.loaders.define('es2016', {
    extensions: ['.es7'],
    mimeTypes: ['text/es7', 'text/es2016'],
    load: function(source, file) {
      var transform = require('babel-standalone').transform(source, {
        presets: ['es2015', 'stage-0'],
        sourceMaps: true
      });
      
      var map = transform.map;
      map.file = file;
      map.sources[0] = file;
      
      return {
        map: map,
        code: transform.code
      };
    }
  });

  runtime.loaders.define('es2015', {
    extensions: ['.es6'],
    mimeTypes: ['text/es6', 'text/es2015'],
    load: function(source, file) {
      var transform = require('babel-standalone').transform(source, {
        presets: ['es2015'],
        sourceMaps: true
      });
      
      var map = transform.map;
      map.file = file;
      map.sources[0] = file;
      
      return {
        map: map,
        code: transform.code
      };
    }
  });

  runtime.loaders.define('react', {
    extensions: ['.jsx'],
    mimeTypes: ['text/react', 'text/jsx'],
    load: function(source, file) {
      var transform = require('babel-standalone').transform(source, {
        presets: ['es2015', 'stage-0', 'react'],
        sourceMaps: true
      });
      
      var map = transform.map;
      map.file = file;
      map.sources[0] = file;
      
      return {
        map: map,
        code: transform.code
      };
    }
  });
  
  runtime.loaders.define('css', {
    extensions: ['.css'],
    mimeTypes: ['text/css', 'text/stylesheet'],
    load: function(css, file) {
      var path = require('path');
      var base = path.dirname(file);
      
      css = css.replace(/url\s*\(\s*(['"]?)([^"'\)]*)\1\s*\)/gi, function(match) {
        match = match.trim().substring(4, match.length - 1).split('"').join('').split('\'').join('').trim();
        if( ~match.indexOf('://') || match.indexOf('//') === 0 ) return 'url(\"' + match + '\")';
        if( match.toLowerCase().indexOf('data:') !== 0 ) match = path.resolve(base, match);
        return 'url(\"' + match + '\")';
      });
      
      var style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('data-src', file);
      document.head.appendChild(style);
      
      css += '\n/*# sourceURL=' + file + ' */';
      
      if (style.styleSheet) style.styleSheet.cssText = css;
      else style.innerHTML = css;
      
      return {
        exports: style
      };
    }
  });
  
  runtime.loaders.define('env', {
    mimeTypes: ['webmodules/env'],
    load: function(source, file) {
      var o = source ? JSON.parse(source) : null;
      for(var k in o) process.env[k] = o[k];
      
      return {
        exports: o
      };
    }
  });
  
  /*
  <script type="webmodules/env">
    {
      "LESS_LOADER_MODIFY_VARS": {
        "match": "bootstrap-theme-attrs/less/index.less",
        "@font-family-sans-serif": "'Spoqa Han Sans', 'Nanum Gothic', Arial, Helvetica, sans-serif",
        "@font-family-serif": "'Nanum Myeongjo', Georgia, 'Times New Roman', Times, serif",
        "@font-family-monospace": "Menlo, Monaco, Consolas, 'Courier New', monospace",
        "@font-family-script": "'Nanum Pen Script', 'Dancing Script', 'Spoqa Han Sans', 'Nanum Gothic', Arial, Helvetica, sans-serif",
        "@font-size-base": "13px"
      }
    }
  </script>
  */
  runtime.loaders.define('less', {
    extensions: ['.less'],
    mimeTypes: ['text/less'],
    load: function(source, file) {
      var vars = (function(vars) {
        if( !vars ) return;
        try {
          if( typeof vars == 'string' ) vars = JSON.parse(vars);
          if( typeof vars != 'object' ) return;
          if( !Array.isArray(vars) ) vars = [vars];
          
          var matched;
          vars.forEach && vars.forEach(function(v) {
            if( !v.match ) return;
            if( require('minimatch')(file, v.match, { matchBase: true }) ) {
              matched = v;
            }
          });
          
          return matched;
        } catch(err) {
          console.warn('[webmodules] LESS_LOADER_MODIFY_VARS parse error', err);
        }
      })(process.env['LESS_LOADER_MODIFY_VARS']);
      
      if( vars ) console.info('[webmodules] less loader with modifyVars', file, vars);
      
      var less = require('less/lib/less-browser/index.js')(window, {});
      var sourcemap = require('./source-map.js');
      
      less.environment.getSourceMapGenerator = function() {
        return sourcemap.SourceMapGenerator;
      };
      
      less.environment.encodeBase64 = function(str) {
        return btoa(str);
      };
      
      var options = {
        relativeUrls: true,
        filename: file.replace(/#.*$/, ''),
        modifyVars: vars || {},
        sourceMap: true
      };
      
      var style = document.createElement('style');
      style.setAttribute('type', 'text/css');
      style.setAttribute('data-src', file);
      document.head.appendChild(style);
      
      less.render(source, options).then(function(result) {
        var css = result.css;
        var map = result.map;
        
        if( map ) {
          map = JSON.parse(result.map);
          map.file = file || map.file;
          map.sourceRoot = location.origin;
          
          var sources = [];
          map.sources.forEach(function(src) {
            if( src[0] !== '/' ) return;
            sources.push(src.substring(1));
          });
          map.sources = sources;
          
          css += "\n/*# sourceMappingURL=data:application/json;base64," + btoa(unescape(encodeURIComponent(JSON.stringify(map)))) + ' */';
        }
        
        css += '\n/*# sourceURL=' + file + ' */';
        
        if (style.styleSheet) style.styleSheet.cssText = css;
        else style.innerHTML = css;
      });
      
      return {
        exports: style
      };
    }
  });
  
  runtime.loaders.define('coffee', {
    extensions: ['.coffee'],
    mimeTypes: ['text/coffee', 'text/coffee-script', 'text/coffeescript'],
    load: function(source, file) {
      var coffee = require('coffee-script');
      var compiled = coffee.compile(source, {
        bare: true,
        header: true,
        sourceMap: true
      });
      
      var map = compiled.v3SourceMap;
      if( map ) {
        map = JSON.parse(map);
        map.file = file;
        map.sources[0] = file;
      }
      
      return {
        code: compiled.js,
        map: map
      };
    }
  });
  
  runtime.loaders.define('jquery', {
    mimeTypes: ['text/jquery'],
    load: function(source) {
      source = 'var _jq = window.jQuery;\
        try {\
          var jQuery = window.jQuery = require("jquery");\
          var $ = jQuery;\
          ' + source + '\
        } catch(err) {\
          throw err;\
        } finally {\
          window.jQuery = _jq;\
        }';
      
      return {
        code: source
      };
    }
  });
  
  runtime.loaders.define('text', {
    extensions: ['.txt', '.text', '.htm', '.html'],
    mimeTypes: ['text/plain'],
    load: function(source) {
      return {
        exports: source
      };
    }
  });
  
  runtime.loaders.define('xml', {
    extensions: ['.xml'],
    mimeTypes: ['text/xml', 'application/xml'],
    load: function(source) {
      return {
        exports: new DOMParser().parseFromString(source, 'text/xml')
      };
    }
  });
  
  runtime.loaders.define('html', {
    mimeTypes: ['text/html'],
    load: function(source) {
      return {
        exports: new DOMParser().parseFromString(source, 'text/html')
      };
    }
  });
  
  runtime.loaders.define('webcomponents', {
    mimeTypes: ['text/html-import', 'text/webcomponents'],
    load: function(source) {
      var encoded = btoa(source);
      
      // check supports HTMLImports
      var doc, err;
      if( 'import' in document.createElement('link') ) {
        var link = document.createElement('link');
        link.rel = 'import';
        link.href = 'data:text/html;base64,' + encoded;
        link.onload = function(e) {
          doc = link['import'];
        };
        link.onerror = function(e) {
          console.error('html import error', e);
          err = e;
        };
        document.head.appendChild(link);
      } else {
        err = new Error('browser does not supports HTMLImports');
        console.warn(err.message);
      }
      
      return {
        exports: function(done) {
          done(err, doc);
        }
      };
    }
  });
}

module.exports = {
  runtime: function(o) {
    if( !arguments.length ) return runtime;
    runtime = o;
    init();
    return this;
  },
  require: require
};