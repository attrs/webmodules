var angular = require('angular');

var app = angular.module('app', [])
.controller('test', ['$scope', function($scope) {
  $scope.value = 'Hello Angular';
}]);