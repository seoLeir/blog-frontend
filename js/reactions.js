app.service('ArticleReactionsService', function ($http) {
    const articleReactionsApiPath = `${contextPath}/api/v1/reactions/article`
    return {
        react: function (articleId, liked) {
            return $http.post(articleReactionsApiPath, {
                articleId: articleId,
                liked: liked
            });
        },
        removeReaction: function (articleId) {
            return $http.delete(`${articleReactionsApiPath}/${articleId}`);
        },
        getStatistics: function (articleId) {
            return $http.get(`${articleReactionsApiPath}/statistics/${articleId}`);
        },
        getMyReaction: function (articleId) {
            return $http.get(`${articleReactionsApiPath}/${articleId}`);
        }
    }
});
app.service('CommentReactionService', function ($http) {
    const commentReactionsApiPath = `${contextPath}/api/v1/reactions/comment`;
    return {
        react: function (commentId, liked) {
            return $http.post(commentReactionsApiPath, {
                commentId: commentId,
                liked: liked
            });
        },
        removeReaction(commentId) {
            return $http.delete(`${commentReactionsApiPath}/${commentId}`);
        },
        getStatistics: function (commentId) {
            return $http.get(`${commentReactionsApiPath}/statistics/${commentId}`);
        },
        getMyReaction: function (commentId) {
            return $http.get(`${commentReactionsApiPath}/${commentId}`);
        }
    }
});
app.controller('ReactionController', function ($scope, ReactionService, AuthService) {
    $scope.liked = null;
    $scope.targetId = null
    $scope.reactionStatistics = {
        likesCount: 0,
        dislikesCount: 0
    }
    $scope.$watch($scope.targetId, function (){
       if($scope.targetId != null){
           ReactionService.getStatistics($scope.targetId)
               .then(
                   function (response) {
                       const data = response.data;
                       $scope.reactionStatistics = {};
                       $scope.reactionStatistics.likesCount = data.likesCount;
                       $scope.reactionStatistics.dislikesCount = data.dislikesCount;
                   }
               );
           if (AuthService.isAuthenticated()) {
               ReactionService.getMyReaction($scope.targetId)
                   .then(
                       function (response) {
                           const reaction = response.data;
                           $scope.liked = reaction.hasReaction ? reaction.liked : null;
                       }
                   );
           }
       }
    });
    $scope.canReact = () => false;
    $scope.setLiked = function (liked) {
        const targetId = $scope.targetId
        if ($scope.liked === liked) {
            //удаляем реакцию на эту статью
            ReactionService.removeReaction(targetId)
                .then(function () {
                    if ($scope.liked) $scope.reactionStatistics.likesCount--;
                    else $scope.reactionStatistics.dislikesCount--;
                    $scope.liked = null;
                });
        } else {
            ReactionService.react(targetId, liked)
                .then(function () {
                    if ($scope.liked != null) {
                        if ($scope.liked && $scope.reactionStatistics.likesCount > 0)
                            $scope.reactionStatistics.likesCount--;
                        else if ($scope.reactionStatistics.dislikesCount > 0)
                            $scope.reactionStatistics.dislikesCount--;
                    }
                    if (liked) $scope.reactionStatistics.likesCount++;
                    else $scope.reactionStatistics.dislikesCount++;
                    $scope.liked = liked;
                });
        }
    }
});
app.controller('ArticleReactionController', function ($scope, $controller, ArticleReactionsService, RoleService) {
    Object.setPrototypeOf(this, $controller('ReactionController', {
        $scope: $scope,
        ReactionService: ArticleReactionsService
    }));
    $scope.canReact = () => RoleService.canReactOnArticle();
});
app.controller('CommentReactionController', function ($scope, $controller, CommentReactionService, RoleService) {
    Object.setPrototypeOf(this, $controller('ReactionController', {
        $scope: $scope,
        ReactionService: CommentReactionService
    }));
    $scope.canReact = ()=> RoleService.canReactOnComment();
})