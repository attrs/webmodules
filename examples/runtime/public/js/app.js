var path = require('path');
var $ = window.jQuery = require('jquery');
var angular = require('angular');
var d3 = require('d3');
var react = require('react');
var reactdom = require('react-dom');
var uia = require('ui-aliens');
var moment = require('moment');
var ngSanitize = require('ngSanitize');
var fullcalendar = require('fullcalendar');
var font_awesome = require('font-awesome');
//var less = require('less');
var magnificpopup = require('magnific-popup');
var select2 = require('select2');

// some problem (depends on global.jQuery)
var jqueryui = require('jquery-ui');

// fails
//var socketio = require('socket.io');    // socket.io-browserify : module.parent 문제
//var isotope = require('isotope-layout');
//var jqueryui_monthpicker = require('jquery.ui.montjquery.ui.monthpicker');
//var jqueryui_datepicker = require('jquery-ui-datepicker-languages');


var sub = require('./sub/sub.js');

$(document).ready(function($) {
  process.nextTick(function() {
    console.log('env', process.env);
  });
  
  console.log('module', require.module);
  console.log('jquery', $);
  console.log('angular', angular);
  console.log('d3', d3);
  console.log('react', react);
  console.log('reactdom', reactdom);
  console.log('sub', sub);
  console.log('path', path.join(__dirname, 'test'));
  
  var CommentBox = react.createClass({displayName: 'CommentBox',
    render: function() {
      return (
        react.createElement('div', {className: "commentBox"},
          "Hello, world! I am a CommentBox."
        )
      );
    }
  });
  
  reactdom.render(
    react.createElement(CommentBox, null),
    document.getElementById('content')
  );
});