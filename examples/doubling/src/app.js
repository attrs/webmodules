var path = require('path');
var $ = require('jquery');
var select2 = require('select2');
var test = require('test');

console.log('jquery', Object.keys($));
console.log('test', test);

$(document).ready(function($) {
  console.log('path', path.join(__dirname, 'test'));
  
  $('#test').select2();
});