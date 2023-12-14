app.service('CommentService', ['$http', function ($http) {
    const commentsApiPath = contextPath + '/api/v1/comments';
    return {
        getComments: function (articleId, pageNumber, size) {
            const httpParams = {
                p: pageNumber,
                s: size
            };
            const getQuery = {
                method: 'GET',
                url: commentsApiPath + '/article/' + articleId
            };
            getQuery["params"] = httpParams;
            return $http(getQuery);
        },
        postComment: function (articleId, text) {
            const httpParams = {
                articleId: articleId,
                text: text
            };
            const postQuery = {
                method: 'POST',
                url: commentsApiPath + '/article'
            };
            postQuery["data"] = httpParams;
            return $http(postQuery);
        },
        deleteComment: function(commentId){
            return $http.delete(`${commentsApiPath}/${commentId}`);
        },
        editComment: function (commentId, text){
            return $http.patch(commentsApiPath, {
               commentId: commentId,
               text: text
            });
        }
    }
}]);
// Функция для загрузки комментариев с сервера
app.controller('CommentController', function ($scope, $routeParams, $timeout, CommentService, RoleService, AuthService) {
    $scope.maxCommentLength = 2000;
    $scope.charactersLeftForEditedComment = $scope.maxCommentLength;
    $scope.charactersLeftForNewComment = $scope.maxCommentLength;
    $scope.comments = [];
    $scope.currentPage = 1;
    $scope.itemsPerPage = 5;
    $scope.totalPages = 5;
    $scope.contentLoading = false;
    $scope.loadingError = null;
    $scope.postCommentRequestProcessed = false;
    $scope.editCommentRequestProcessed = false;
    $scope.newComment = {
        text: ''
    };
    $scope.editedComment = {
        text: ''
    };
    $scope.maxPagesToShow = 3; // Максимальное количество отображаемых страниц
    $scope.articleId = $routeParams.articleId;
    $scope.loadMoreComments = function () {
        if($scope.currentPage <= $scope.totalPages && !$scope.contentLoading){
            $scope.contentLoading = true;
            CommentService.getComments($scope.articleId, $scope.currentPage, $scope.itemsPerPage)
                .then(function (response) {
                    $timeout(() => {
                        const currentCommentsIds = new Set($scope.comments.map(c=>c.id));
                        const newComments = response.data.content.filter(c=>!currentCommentsIds.has(c.id));
                        $scope.totalPages = response.data.totalPages;
                        $scope.comments = $scope.comments.concat(newComments);
                        $scope.currentPage++;
                        $scope.contentLoading = false;
                        $scope.loadingError = null;
                    }, 300);
                })
                .catch(function (error) {
                    $scope.loadingError = 'Ошибка загрузки'
                    console.log(error);
                });
        }
    };
    //функция для публикации комментария
    $scope.postComment = function () {
        $scope.postCommentRequestProcessed = true;
        CommentService.postComment($scope.articleId, $scope.newComment.text)
            .then(function (response) {
                $timeout(function () {
                    const publishedComment = response.data;
                    $scope.newComment.text = '';
                    $scope.comments.unshift(publishedComment)
                    $scope.postCommentRequestProcessed = false;
                }, 300)
            })
            .catch(function (error) {
                $timeout(function () {
                    showErrorToast("Ошибка отправки", "Не удалось отправить комментарий!");
                    console.error(error);
                    $scope.postCommentRequestProcessed = false;
                }, 300)
            });
    }
    $scope.deleteItem = function (comment){
        if(!$scope.contentLoading) {
            CommentService.deleteComment(comment.id)
                .then(() => {
                    const items = $scope.comments;
                    const index = items.findIndex(c => c.id === comment.id);
                    if (index !== -1) {
                        items.splice(index, 1);
                        const totalPages = Math.ceil((items.length - 1) / $scope.itemsPerPage);
                        if (totalPages < $scope.totalPages && $scope.currentPage > 1) $scope.currentPage--;
                        $scope.totalPages = totalPages;
                    }
                    if($scope.comments.length < $scope.itemsPerPage) $scope.loadMoreComments();
                })
                .catch(function (error) {
                    showErrorToast("Ошибка", "Ошибка удаления комментария");
                    console.log(error);
                });
        }
    }
    $scope.editItem = function (comment){
        const modalDialogElement = document.getElementById("editCommentModal");
        const editCommentDialog = new bootstrap.Modal(modalDialogElement, {});
        document.getElementById("confirmCommentEdit").onclick = function () {
            $scope.editCommentRequestProcessed = true;
            const text = $scope.editedComment.text;
            CommentService.editComment(comment.id, text)
                .then(() =>
                    $timeout(function () {
                        const index = $scope.comments.findIndex(c => c.id === comment.id);
                        if (index !== -1) $scope.comments[index].text = text;
                        $scope.editCommentRequestProcessed = false;
                        editCommentDialog.hide();
                    }, 300)
                )
                .catch(function(error){
                    $timeout(function (){
                        showErrorToast("Ошибка редактирования", "Не удалось отредактировать комментарий")
                        console.log(error);
                        $scope.editCommentRequestProcessed = false;
                    }, 300);
                })
        }
        $scope.editedComment.text = comment.text;
        $scope.charactersLeftForEditedComment = $scope.maxCommentLength - comment.text;
        editCommentDialog.show();
    }
    $scope.canPost = RoleService.isCommenter;
    // Обработчик изменения общего количества страниц (возможно, при загрузке данных с сервера)
    $scope.canEditItem = function (comment) {
        return  AuthService.isAuthenticated() && AuthService.getMyUserName() === comment.authorName;
    }
    $scope.canDeleteItem = function (comment) {
        return RoleService.isAdmin() || (AuthService.isAuthenticated() && AuthService.getMyUserName() === comment.authorName);
    }
    $scope.hasAnyActionsForItem = function (comment){
        return $scope.canEditItem(comment) || $scope.canDeleteItem(comment);
    }
    $scope.$watch('editedComment.text', function(){
        $scope.charactersLeftForEditedComment = $scope.maxCommentLength - ($scope.editedComment.text ? $scope.editedComment.text.length : 0);
    });
    $scope.$watch('newComment.text', function(){
        $scope.charactersLeftForNewComment = $scope.maxCommentLength - ($scope.newComment.text ? $scope.newComment.text.length : 0);
    });
    $scope.loadMoreComments();
});
app.directive('ngScroll', function () {
    return function (scope, element, attrs) {
        const raw = element[0];
        element.bind('scroll', function () {
            if (raw.scrollTop + raw.offsetHeight >= raw.scrollHeight) {
                scope.$apply(attrs.ngScroll);
            }
        });
    };
});