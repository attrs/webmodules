var path = require('path');
var $ = require('jquery');
var sub = require('./sub/sub.js');

$(document).ready(function($) {
  console.log('module', require.module);
  console.log('jquery', $);
  console.log('sub', sub);
  console.log('path', path.join(__dirname, 'test'));
});