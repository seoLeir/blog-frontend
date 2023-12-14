const app = angular.module('blog', ['ngRoute']);
app.config(function ($routeProvider) {
    $routeProvider
        .when('/articles', {
            templateUrl: 'articlesList.html',
        })
        .when('/articles/:articleId', {
            templateUrl: 'article.html',
        })
        .when('/new_article', {
            templateUrl: 'publish_article.html'
        })
        .when("/user_control",{
            templateUrl: 'users.html'
        })
        .otherwise({redirectTo: '/articles'});
});
// Определение интерцептора
const contextPath = window.location.origin + '/blog';