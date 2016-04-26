var angular = require('angular');

var app = angular.module('app', [])
.controller('test', ['$scope', function($scope, api) {
  $scope.value = 'Hello Angular';
}]);