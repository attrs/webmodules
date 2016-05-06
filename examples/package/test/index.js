var tinyget = require('../');

// #1
tinyget('http://127.0.0.1:9000/data.json').qry({key: 'value'}).exec(function(err, result) {
  if( err ) return console.log('#1', err.stack);
  console.log('#1', typeof result);
});

// #2
tinyget({
  url: 'http://127.0.0.1:9000/data.text',
  payload: {key:'value'}
}).exec(function(err, result) {
  if( err ) return console.log('#2', err.stack);
  console.log('#2', typeof result);
});

// #3
tinyget({
  url: 'http://127.0.0.1:9000/data.xml',
  qry: {a:'b'},
  payload: {key:'value'}
}, function(err, result) {
  if( err ) return console.log('#3', err.stack);
  console.log('#3', typeof result);
});

// #4
tinyget('http://127.0.0.1:9000/data.json').type('text').exec(function(err, result) {
  if( err ) return console.log('#4', err.stack);
  console.log('#4', typeof result);
});

// #5
tinyget('http://127.0.0.1:9000/data.json').type('json').exec(function(err, result) {
  if( err ) return console.log('#5', err.stack);
  console.log('#5', typeof result);
});

// #6
tinyget('http://127.0.0.1:9000/data.xml').type('text').exec(function(err, result) {
  if( err ) return console.log('#6', err.stack);
  console.log('#6', typeof result);
});

// #7
tinyget('http://127.0.0.1:9000/data.text').type('json').exec(function(err, result) {
  if( err ) return console.log('#7', err.stack);
  console.log('#7', typeof result);
});

// #8
tinyget('http://127.0.0.1:9000/data.html').exec(function(err, result) {
  if( err ) return console.log('#8', err.stack);
  console.log('#8', typeof result);
});

// #9
tinyget('http://127.0.0.1:9000/data.html').type('document').exec(function(err, result) {
  if( err ) return console.log('#9', err.stack);
  console.log('#9', typeof result);
});

// #10
tinyget('http://127.0.0.1:9000/data.html').type('text').exec(function(err, result) {
  if( err ) return console.log('#10', err.stack);
  console.log('#10', typeof result);
});

// #11
tinyget('http://127.0.0.1:9000/data.html').type('json').exec(function(err, result) {
  if( err ) return console.log('#11', err.stack);
  console.log('#11', typeof result);
});