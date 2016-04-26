var path = require('path');
var jquery = require('jquery');
var d3 = require('d3');
var fa = require('font-awesome/css/font-awesome.min.css');
var React = require('react');
var ReactDOM = require('react-dom');
var custom_lib = require('custom-lib');
var custom_lib_inline = require('custom-lib-inline');
var sub = require('./sub/sub.js');

console.info('linked commonjs', __dirname, __filename);
console.log('path', path);
console.log('jquery', jquery);
console.log('d3', d3);
console.log('font-awesome', fa);
console.log('react', React);
console.log('react-dom', ReactDOM);
console.log('custom-lib', custom_lib);
console.log('custom-lib-inline', custom_lib_inline);
console.log('sub', sub);

console.log('files/script.es6', require('./files/script.es6'));
console.log('files/script.jsx', require('./files/script.jsx'));
console.log('files/script.es6.jsx', require('./files/script.es6.jsx'));
console.log('files/script.coffee', require('./files/script.coffee'));
console.log('files/style.css', require('./files/style.css'));
console.log('files/style.less', require('./files/style.less'));
console.log('files/wc.html', require('./files/wc.html'));


jquery(document).ready(function($) {
  process.nextTick(function() {
    console.log('env', process.env);
  });
  
  ReactDOM.render(
    React.createElement(require('./files/script.jsx'), {
      pagename: 'Engineering'
    }),
    document.getElementById('react')
  );
  
  ReactDOM.render(
    React.createElement(require('./files/script.es6.jsx').Avatar, {
      pagename: 'Engineering'
    }),
    document.getElementById('react-es6')
  );
});