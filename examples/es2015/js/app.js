import $ from 'jquery';
import calc, {sayHello} from './sub.js';
import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../css/jumbotron.css';

$(document).ready(($) => {
  $('.jumbotron > .container > h1').html(`${sayHello()} - ${calc(1)}`);
});
