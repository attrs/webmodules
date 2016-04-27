var path = require('path');
var $ = require('jquery');
var select2 = require('select2');

console.log('jquery', $);

$(document).ready(function($) {
  console.log('path', path.join(__dirname, 'test'));
  
  $('#test').select2();
});