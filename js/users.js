app.service('UserService', function ($http) {
    const usersApiPath = contextPath + '/api/v1/users';
    return {
        //получение информации о пользователях для администраторов
        getUserInfoAboutAllUsers: function (filterParams, pageNumber, pageSize) {
            const httpParams = generatePageParamsAndFilterParams(filterParams, pageNumber, pageSize);
            const httpQuery = {
                method: 'GET',
                url: `${usersApiPath}`
            };
            httpQuery["params"] = httpParams;
            return $http(httpQuery);
        },
        createUser: function (username, password, rolesNames) {
            const createUserRequest = {
                name: username,
                password: password,
                roleNames: rolesNames
            };
            return $http.post(usersApiPath, createUserRequest);
        },
        deleteUserById: function (userId) {
            return $http.delete(`${usersApiPath}/${userId}`);
        },
        updateRoles: function (userId, rolesNames) {
            const httpData = {
                userId: userId,
                rolesNames: rolesNames
            };
            return $http.patch(`${usersApiPath}/roles`, httpData);
        },
        changePassword: function (password){
            return $http.patch(`${usersApiPath}/password`, null, {params: {password: password}});
        }
    }
});
app.controller('PasswordChangeController', function ($scope, $timeout, UserService){
    const changePasswordModalDialog = bootstrap.Modal.getOrCreateInstance("#changePasswordModal", {
        keyboard:false
    });
    $scope.password = '';
    $scope.confirmPassword = '';
    $scope.requestProcessed = false;//показывает, обрабатывается ли запрос
    $scope.apply = function (){
        if($scope.password === $scope.confirmPassword && $scope.password !== '') {
            $scope.requestProcessed = true;
            UserService.changePassword($scope.password)
                .then(() =>  $timeout(() => {
                    changePasswordModalDialog.hide();
                    $scope.reset()
                }, 300))
                .catch(function (error) {
                    $timeout(()=>{
                        $scope.requestProcessed = false;
                        showErrorToast("Ошибка смены пароля", "Не удалось сменить пароль!");
                        console.log(error)
                    }, 300)
                });
        }
    }
    $scope.reset = function (){
        $scope.requestProcessed = false;
        $scope.password = '';
        $scope.confirmPassword = '';
    }
})
app.controller('UserController', function ($scope, $timeout, UserService, AuthService, RoleService) {
    $scope.users = [];
    $scope.newRoles = {};//в этом объекте, по ИД пользователя, будет храниться: изменён он или нет, и какие роли у него установлены
    $scope.filterParams = {};//текущие параметры для фильтрации пользователей
    $scope.filter = {};//модель для фильтрационной формы
    $scope.filter.roles = {};//инициализируем роли для фильтра
    $scope.currentPage = 1;//текущая страница с пользователями
    $scope.itemsPerPage = 5;//количество пользователей на страницу
    $scope.totalPages = 1;//всего страниц(в дальнейшем будет оно будет обновлено, при получении страниц
    $scope.maxPagesToShow = 3; // Максимальное количество отображаемых страниц
    $scope.isAuthenticated = AuthService.isAuthenticated;//метод для проверки на наличие авторизации
    $scope.canAdmin = RoleService.isAdmin;//метод для проверки является ли пользователь администратором
    $scope.availableRoles = RoleService.getAvailableRoles();//метод для получения доступных ролей
    $scope.contentLoading = false;//показывает, загружаются ли пользователи
    $scope.loadingError = null;//содержит текст ошибки загрузки, если таковая возникла
    $scope.newUser = {
        name: "",
        password: ""
    };// определяем модель для формы создания пользователя
    $scope.newUser.roles = {};//инициализируем роли для нового пользователя пустым массивом
    $scope.availableRoles.forEach(function (roleName) {
        $scope.filter.roles[roleName] = false;//по умолчанию выключены требования всех ролей
        $scope.newUser.roles[roleName] = false;//выключаем требования всех ролей для создания пользователей
    });
    $scope.filterUsers = function () {//метод для применения фильтра по пользователям
        let rolesForFilter = $scope.availableRoles.filter(roleName => $scope.filter.roles[roleName]);
        $scope.filterParams = {
            name: $scope.filter.name,
            roles: rolesForFilter
        };
        $scope.getPage(1);
    }
    $scope.resetFilter = function (){
        $scope.filterParams = {};
        $scope.filter = {};
        $scope.getPage(1);
    }
    function setRolesData(userId, rolesNames) {
        $scope.availableRoles.forEach(function (roleName) {
            $scope.newRoles[userId][roleName] = rolesNames.includes(roleName);
        });
    }

    $scope.loadUsersInfo = function (filterParams, pageNumber) {//метод для получения информации о пользователях
        $scope.contentLoading = true;
        UserService.getUserInfoAboutAllUsers(filterParams, pageNumber, $scope.itemsPerPage)
            .then(function (response) {
                $scope.users = response.data.content;
                $scope.newRoles = {};
                $scope.users.forEach(function (user) {
                    $scope.newRoles[user.userId] = {};
                    let rolesNames = user.roles.map(r => r.name);
                    setRolesData(user.userId, rolesNames)
                    $scope.newRoles[user.userId].isChanged = false;
                });
                $scope.totalPages = response.data.totalPages;
                $scope.currentPage = pageNumber;
                $timeout(function () {
                    $scope.contentLoading = false;
                    $scope.loadingError = null;
                }, 300);
            })
            .catch(function (error){
                $scope.contentLoading = false;
                $scope.loadingError = 'Ошибка загрузки'
                console.log(error);
            });
    };
    $scope.getPage = function (pageNumber) {//метод для получения заданной страницы
        $scope.loadUsersInfo($scope.filterParams, pageNumber);
        $scope.pageNumbers = calculatePageNumbers($scope.currentPage, $scope.totalPages, $scope.maxPagesToShow);
    };
    $scope.deleteUser = function (user) {//метод для обработки кнопки удаления пользователя
        const userId = user.userId
        user.deleting = true;
        UserService.deleteUserById(userId)
            .then(() => $timeout(function () {
                    user.deleting = false;
                    deleteItemAndGetNewPage($scope.users, $scope.totalPages, $scope.currentPage, user => user.userId === userId, $scope.getPage);
                }, 300))
            .catch(function (error) {
                $timeout(()=>{
                    user.deleting = false;
                    showErrorToast("Ошибка удаления", `Не удалось удалить пользователя ${user.name}`);
                    console.log(error);
                }, 300);
            });
    };
    $scope.createUser = function () {
        let name = $scope.newUser.name;
        let password = $scope.newUser.password;
        let rolesNames = $scope.availableRoles.filter(roleName => $scope.newUser.roles[roleName]);
        $scope.userCreating = true;
        UserService.createUser(name, password, rolesNames)
            .then(function (response) {
                $timeout(function () {
                    let userCreatedResponse = response.data;
                    $scope.newUser.name = '';
                    $scope.newUser.password = '';
                    $scope.availableRoles.forEach(function (roleName) {
                        $scope.newUser.roles[roleName] = false;
                    });
                    $scope.userCreating = false;
                    if ($scope.users.length < $scope.itemsPerPage) {//в случае если количество элементов на текущей странице меньше чем максимальное количество элементов на странице
                        //то мы просто вставляем пользователя на эту страницу
                        let createdUser = {
                            userId: userCreatedResponse.userId,
                            name: name,
                            password: password
                        };
                        createdUser.roles = rolesNames.map(rn => {
                            return {name: rn}
                        });
                        $scope.newRoles[createdUser.userId] = {}
                        rolesNames.forEach(function (roleName) {
                            $scope.newRoles[createdUser.userId][roleName] = true;
                        });
                        $scope.users.push(createdUser);
                    } else if ($scope.totalPages === $scope.currentPage) {//в случае если мы находимся на последней странице и на ней уже максимальное количество элементов
                        //увеличиваем количество страниц
                        $scope.totalPages += 1;
                    }

                }, 300);
            })
            .catch(function (error) {
                $timeout(function (){
                    showErrorToast("Ошибка создания", `Не удалось создать пользователя ${name}`)
                    console.log(error);
                    $scope.userCreating = false;
                }, 300);
            });
    }
    $scope.isItMe = function (user) {//метод для проверки является ли переданный пользователь, тем, под которым вошли
        return user.name === AuthService.getMyUserName();
    }
    $scope.hasRole = function (user, roleName) {//метод для проверки наличия роли у пользователя(роль ищется по имени)
        return user.roles.map(r => r.name).includes(roleName);
    };
    $scope.updateRoles = function (user) {//метод для обновления состояния о том, изменёны ли роли у пользователя
        let countOfDifferences = 0;
        let roleName;
        for (let i = 0; i < $scope.availableRoles.length; i++) {
            roleName = $scope.availableRoles[i];
            if ($scope.hasRole(user, roleName) !== $scope.newRoles[user.userId][roleName]) {
                countOfDifferences++;
            }
        }
        $scope.newRoles[user.userId].isChanged = countOfDifferences > 0;
    };
    $scope.applyChanges = function (user) {//метод для обработки кнопки "применить изменения"
        let newPrivileges = $scope.availableRoles.filter(r => $scope.newRoles[user.userId][r]);
        $scope.newRoles[user.userId].rolesUpdating = true;
        UserService.updateRoles(user.userId, newPrivileges)
            .then(()=> $timeout(() => {
                        user.roles = newPrivileges.map(rn => {
                            return {name: rn}
                        });
                        $scope.newRoles[user.userId] = {};
                        $scope.newRoles[user.userId].isChanged = false;
                        setRolesData(user.userId, newPrivileges);
                        $scope.newRoles[user.userId].rolesUpdating = false;
                    }, 300)
            )
            .catch(function (error) {
                $timeout(()=>{
                    showErrorToast("Ошибка обновления", `Не удалось обновить роли для пользователя ${user.name}`);
                    console.log(error);
                    $scope.newRoles[user.userId].rolesUpdating = false;
                }, 300);
            });
    };
    // Обработчик изменения общего количества страниц (возможно, при загрузке данных с сервера)
    $scope.$watch('totalPages', function () {
        $scope.pageNumbers = calculatePageNumbers($scope.currentPage, $scope.totalPages, $scope.maxPagesToShow);
    });
    if ($scope.canAdmin()) $scope.getPage(1);
});