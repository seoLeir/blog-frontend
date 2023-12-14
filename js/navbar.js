app.controller('NavbarController', function($scope, $location, RoleService, AuthService){
    $scope.showPostArticleItem = ()=> RoleService.isPublisher();
    $scope.canAdministrate = ()=> RoleService.isAdmin();
    $scope.isActive = function (viewLocation) {
        return viewLocation === $location.path();
    };
    $scope.isAuthenticated = ()=> AuthService.isAuthenticated();
    $scope.logout = ()=> AuthService.logout();
});