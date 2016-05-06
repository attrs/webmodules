var querystring = require('querystring');


function tinyget(options, callback) {
  options = options || {};
  if( typeof options === 'string' ) options = { url:options };
  
  var events = (function() {
    var listeners = {};
    
    function fire(type, detail) {
      (listeners[type] || []).forEach(function(listener) {
        listener({
          type: type,
          detail: detail
        });
      });
    }
    
    function on(type, fn) {
      listeners[type] = listeners[type] || [];
      listeners[type].push(fn);
    }
  
    function once(type, fn) {
      var wrap = function(e) {
        off(type, wrap);
        return fn(e);
      };
      on(type, wrap);
    }
    
    function off(type, fn) {
      var fns = listeners[type];
      if( fns ) for(var i;~(i = fns.indexOf(fn));) fns.splice(i, 1);
    }
    
    return {
      fire: fire,
      on: on,
      once: once,
      off: off
    }
  })();
  
  var chain = {
    url: function(url) {
      if( !arguments.length ) return options.url;
      options.url = url;
      return this;
    },
    payload: function(payload) {
      if( !arguments.length ) return options.payload || options.body;
      options.payload = payload;
      return this;
    },
    qry: function(qry) {
      if( !arguments.length ) return options.qry;
      options.qry = qry;
      return this;
    },
    sync: function(sync) {
      if( !arguments.length ) return options.sync;
      options.sync = sync;
      return this;
    },
    contentType: function(contentType) {
      if( !arguments.length ) return options.contentType;
      options.contentType = contentType;
      return this;
    },
    responseType: function(responseType) {
      if( !arguments.length ) return options.responseType;
      options.responseType = responseType;
      return this;
    },
    type: function(type) {
      if( !arguments.length ) return options.type;
      options.type = type;
      return this;
    },
    headers: function(headers) {
      if( !arguments.length ) return options.headers;
      if( !~['object', 'function'].indexOf(typeof headers) ) return console.error('headers must be an object or function') || this;
      options.headers = headers || {};
      return this;
    },
    header: function(name, value) {
      if( !name ) return console.error('missing header name') || this;
      if( typeof name !== 'string' ) return console.error('header name must be a string') || this;
      if( arguments.length === 1 ) return options.headers[name];
      
      if( !options.headers ) options.headers = {};
      else if( typeof options.headers === 'function' ) return console.error('options.headers is function') || this;
      
      if( value == null ) delete options.headers[name];
      else options.headers[name] = value;
      return this;
    },
    on: function(type, listener) {
      events.on(type, listener);
      return this;
    },
    once: function(type, listener) {
      events.once(type, listener);
      return this;
    },
    off: function(type, listener) {
      events.off(type, listener);
      return this;
    },
    exec: function(done) {
      if( typeof done !== 'function' ) done = function() {};
      if( !options ) return done(new Error('missing options'));
      if( !tinyget.connector ) return done(new Error('connector not found'));
      
      var url = options.url;
      var method = options.method || 'get';
      var qry = options.qry;
      var payload = options.payload || options.body;
      var headers = options.headers;
      var contentType = options.contentType;
      var responseType = options.responseType;
      var type = options.type;
      var sync = options.sync === true ? true : false;
      
      if( typeof url === 'function' ) url = url();
      if( typeof method === 'function' ) method = method();
      if( typeof qry === 'function' ) qry = qry();
      if( typeof payload === 'function' ) payload = payload();
      if( typeof headers === 'function' ) headers = headers();
      if( typeof contentType === 'function' ) contentType = contentType();
      if( typeof responseType === 'function' ) responseType = responseType();
      if( typeof type === 'function' ) type = type();
      if( typeof sync === 'function' ) sync = sync();
      
      if( !url ) return done(new Error('missing url'));
      if( typeof url !== 'string' ) return fn(new Error('url must be a string: ' + typeof url));
      
      if( qry ) {
        if( typeof qry === 'object' ) qry = querystring.encode(qry);
        if( typeof qry === 'string' ) {
          if( ~url.indexOf('?') ) url = url + '&' + qry;
          else url = url + '?' + qry;
        }
      }
      
      if( payload ) {
        if( contentType && ~contentType.indexOf('json') ) {
          payload = typeof payload === 'object' ? JSON.stringify(payload) : payload.toString();
        } else if( !contentType || contentType === 'application/x-www-form-urlencoded' ) {
          payload = typeof payload === 'object' ? querystring.encode(payload) : payload.toString();
        } else if( !contentType && typeof payload === 'object' ) {
          contentType = 'application/json';
          payload = JSON.stringify(payload);
        }
      }
      
      if( contentType ) headers['Content-Type'] = contentType;
      
      tinyget.connector({
        url: url,
        method: method,
        payload: payload,
        headers: headers,
        responseType: responseType,
        sync: sync
      }, function(err, response) {
        if( err ) events.fire('error', {
          response: response,
          error: err
        }), done(err);
        
        try {
          var text = response.text, xml = response.data, data;
          var headers = response.headers || {};
          
          for(var k in headers) headers[k.toLowerCase()] = headers[k];
          response.headers = headers;
          
          var contentType = headers['content-type'];
          
          if( responseType ) {
            data = xml;
          } else if( type === 'document' ) {
            data = ( !xml || typeof xml === 'string' ) ? tinyget.toDocument(xml || text) : xml;
          } else if( type === 'xml' ) {
            data = ( !xml || typeof xml === 'string' ) ? tinyget.toXml(xml || text) : xml;
          } else if( type === 'json' ) {
            data = JSON.parse(text);
          } else if( type === 'text' ) {
            data = text;
          } else {
            if( contentType && ~contentType.indexOf('/xml') )
              data = ( !xml || typeof xml === 'string' ) ? tinyget.toXml(xml || text) : xml;
            else if( contentType && ~contentType.indexOf('/html') )
              data = ( !xml || typeof xml === 'string' ) ? tinyget.toDocument(xml || text) : xml;
            else if( contentType && ~contentType.indexOf('/json') )
              data = JSON.parse(text);
            else
              data = text;
          }
          
          events.fire('load', {response:response, data:data});
          done(null, data, response);
        } catch(err) {
          events.fire('error', {
            response: response,
            error: err
          });
          done(err, null, response);
        }
      });
      
      return this;
    }
  }
  
  if( typeof callback === 'function' ) return chain.exec(callback);
  return chain;
}

tinyget.get = function(options) {
  return tinyget(options);
};

tinyget.options = function(options) {
  if( typeof options === 'string' ) options = {url:options};
  options = options || {};
  options.method = 'options';
  return tinyget(options);
};

tinyget.post = function(options) {
  if( typeof options === 'string' ) options = {url:options};
  options = options || {};
  options.method = 'post';
  return tinyget(options);
};

tinyget.put = function(options) {
  if( typeof options === 'string' ) options = {url:options};
  options = options || {};
  options.method = 'put';
  return tinyget(options);
};

tinyget.delete = function(options) {
  if( typeof options === 'string' ) options = {url:options};
  options = options || {};
  options.method = 'delete';
  return tinyget(options);
};

module.exports = tinyget;