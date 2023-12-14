app.service('ArticleService', function ($http) {
    const articlesApiPath = contextPath + '/api/v1/articles';
    return {
        getArticlesInfo: function (filterParams, pageNumber, pageSize) {
            const httpParams = generatePageParamsAndFilterParams(filterParams, pageNumber, pageSize);
            const httpQuery = {
                method: 'GET',
                url: articlesApiPath + '/info/all'
            };
            httpQuery["params"] = httpParams;
            return $http(httpQuery);
        },
        getArticle: function (articleId) {
            return $http.get(`${articlesApiPath}/${articleId}`);
        },
        postArticle: function (title, text) {
            return $http.post(articlesApiPath, {
                title: title,
                text: text
            });
        },
        openArticle: function (articleId) {
            document.location.hash = `!/articles/${articleId}`;
        },
        deleteArticle: function (articleId){
            return $http.delete(`${articlesApiPath}/${articleId}`);
        },
        editArticle: function (article){
            return $http.patch(`${articlesApiPath}/${article.id}`, {
                text: article.text,
                title: article.title
            });
        }
    };
});
app.controller('ArticlesController', function ($scope, $timeout, ArticleService, RoleService, AuthService) {
    $scope.articles = [];
    $scope.filterParams = {};
    $scope.filter = {};
    $scope.currentPage = 1;
    $scope.itemsPerPage = 5;
    $scope.totalPages = 5;
    $scope.contentLoading = false;
    $scope.loadingError = null;
    $scope.maxPagesToShow = 3; // Максимальное количество отображаемых страниц
    $scope.editingArticle = null;
    $scope.filterArticles = function () {
        $scope.filterParams = $scope.filter;
        $scope.getPage(1);
    };
    $scope.loadArticlesInfo = function (filterParams, pageNumber) {
        $scope.contentLoading = true;
        ArticleService.getArticlesInfo(filterParams, pageNumber, $scope.itemsPerPage)
            .then(function (response) {
                $scope.articles = response.data.content;
                $scope.totalPages = response.data.totalPages;
                $scope.currentPage = pageNumber;
                $timeout(function () {
                    $scope.contentLoading = false;
                    $scope.loadingError = null;
                }, 300);
            })
            .catch(function (error) {
                $scope.loadingError = 'Ошибка загрузки';
                console.log(error);
            });
    };
    $scope.resetFilter = function(){
        $scope.filterParams = {};
        $scope.filter = {};
        $scope.getPage(1);
    };
    $scope.getPage = function (pageNumber) {
        $scope.loadArticlesInfo($scope.filterParams, pageNumber);
        $scope.pageNumbers = calculatePageNumbers($scope.currentPage, $scope.totalPages, $scope.maxPagesToShow);
    };
    $scope.goToArticle = function (articleId) {
        ArticleService.openArticle(articleId)
    };
    $scope.deleteItem = function (article){
        ArticleService.deleteArticle(article.id)
            .then(() => deleteItemAndGetNewPage($scope.articles, $scope.totalPages, $scope.currentPage, a => a.id === article.id, $scope.getPage))
            .catch(function (error) {
                showErrorToast("Ошибка", "Ошибка удаления статьи");
                console.log(error);
            });
    }
    $scope.editItem = function (article){
        ArticleService.getArticle(article.id)
            .then(function (response) {
                $scope.editingArticle = response.data
                const editDialog = new bootstrap.Modal(document.getElementById("editArticleModal"), {});
                document.getElementById("confirmEditArticle").onclick = function (){
                    $scope.editArticleRequestProcessing = true;
                    ArticleService.editArticle($scope.editingArticle)
                        .then(() => $timeout(function () {
                                $scope.editArticleRequestProcessing = false;
                                editDialog.hide();
                            }, 300))
                        .catch(error => $timeout(function () {
                                showErrorToast("Ошибка", "Не удалось отредактировать статью!");
                                console.log(error);
                                $scope.editArticleRequestProcessing = false;
                            }, 300));
                };
                editDialog.show();
            });
    }
    $scope.canEditItem = function (article) {
        return (AuthService.isAuthenticated() && AuthService.getMyUserName() === article.publisher.name);
    }
    $scope.canDeleteItem = function (article) {
        return RoleService.isAdmin() || (AuthService.isAuthenticated() && AuthService.getMyUserName() === article.publisher.name);
    }
    $scope.hasAnyActionsForItem = function (article){
        return $scope.canEditItem(article) || $scope.canDeleteItem(article);
    }
    // Обработчик изменения общего количества страниц (возможно, при загрузке данных с сервера)
    $scope.$watch('totalPages', function () {
        $scope.pageNumbers = calculatePageNumbers($scope.currentPage, $scope.totalPages, $scope.maxPagesToShow);
    });
    $scope.getPage(1);
});
app.controller('ArticleController', function ($scope, $routeParams, $timeout, ArticleService, RoleService) {
    $scope.maxArticleTitleLength = 255;
    $scope.maxArticleTextLength = 5000;
    $scope.articlePublishing = false;
    if ($routeParams.articleId) {
        ArticleService.getArticle($routeParams.articleId).then(function (response) {
            $scope.article = response.data;
        });
    }
    //переменная содержащая новую статью для публикации
    $scope.newArticle = {
        title: '',
        text: ''
    }
    //метод сообщающий о том, может ли пользователь писать статьи
    $scope.canPublish = () => RoleService.isPublisher();
    //метод публикующий статью
    $scope.publishArticle = function () {
        $scope.articlePublishing = true;
        ArticleService.postArticle($scope.newArticle.title, $scope.newArticle.text)
            .then(function (response) {
                $timeout(function () {
                    //здесь мы ожидаем что нам в ответ придёт как минимум id новой статьи
                    const articleId = response.data.articleId;
                    $scope.newArticle.title = ''
                    $scope.newArticle.text = ''
                    $scope.articlePublishing = false
                    ArticleService.openArticle(articleId);
                }, 300);
            })
            .catch(function (error) {
                $timeout(function () {
                    showErrorToast("Ошибка публикации", "Не удалось опубликовать статью!")
                    console.error(error)
                    $scope.articlePublishing = false
                }, 300);
            });
    };
});