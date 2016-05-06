var base = require('./base.js');
var request = require('request');
var DOMParser = require('xmldom').DOMParser;
var jsdom = require('jsdom');

function createResponse(res, body, xml) {
  return {
    status: res && res.statusCode,
    headers: res && res.headers,
    text: body
  };
}

base.connector = function(options, done) {
  if( options.sync ) return done(new Error('sync option is not supported'));
  
  request({
    url: options.url,
    method: options.method.toUpperCase(),
    headers: options.headers,
    body: options.payload
  }, function(err, res, body) {
    if( err ) return done(err, createResponse(res, body));
    done(null, createResponse(res, body));
  });
};

base.toXml = function(text) {
  return new DOMParser().parseFromString(text, 'text/xml');
};

base.toDocument = function(text) {
  return new DOMParser().parseFromString(text, 'text/html');
};

module.exports = base;
