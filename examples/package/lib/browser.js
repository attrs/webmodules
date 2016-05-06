var base = require('./base.js');

/**
 * XmlHttpRequest's getAllResponseHeaders() method returns a string of response
 * headers according to the format described here:
 * http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders-method
 * This method parses that string into a user-friendly key/value pair object.
 * https://gist.github.com/mmazer/5404301
 */
function parseResponseHeaders(headerStr) {
  var headers = {};
  if (!headerStr) {
    return headers;
  }
  var headerPairs = headerStr.split('\u000d\u000a');
  for (var i = 0, len = headerPairs.length; i < len; i++) {
    var headerPair = headerPairs[i];
    var index = headerPair.indexOf('\u003a\u0020');
    if (index > 0) {
      var key = headerPair.substring(0, index);
      var val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }
  return headers;
}

function createResponse(xhr) {
  return {
    status: xhr.status,
    headers: parseResponseHeaders(xhr.getAllResponseHeaders()),
    text: xhr.responseText,
    data: xhr.response || xhr.responseXML
  };
}

base.connector = function(options, done) {
  var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");
  xhr.open(options.method, options.url, !options.sync);
  
  xhr.onload = function() {
    done(null, createResponse(xhr));
  };
  xhr.onerror = function() {
    done(new Error('error(' + xhr.status + '): ' + options.url), createResponse(xhr));
  };
  xhr.onabort = function() {
    done(new Error('aborted: ' + options.url), createResponse(xhr));
  };
  xhr.ontimeout = function() {
    done(new Error('timeout: ' + options.url), createResponse(xhr));
  };
  
  for(var key in options.headers ) xhr.setRequestHeader(key, options.headers[key]);
  if( options.responseType ) xhr.responseType = options.responseType;
  if( options.payload ) xhr.send(options.payload);
  else xhr.send();
};

base.toXml = function(text) {
  return new DOMParser().parseFromString(text, 'text/xml');
};

base.toDocument = function(text) {
  return new DOMParser().parseFromString(text, 'text/html');
};

module.exports = base;