var $ = require('jquery');
var sub = require('./sub.js');

$(document).ready(function($) {
    $('#content').html('hello, ' + sub.value);
});