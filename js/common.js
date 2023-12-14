function calculatePageNumbers(currentPage, totalPages, maxPagesToShow) {
    const pageNumbers = [];
    if (totalPages <= maxPagesToShow) {
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
    } else {
        let startPage;
        let endPage;
        if (currentPage <= Math.ceil(maxPagesToShow / 2)) {
            startPage = 1;
            endPage = maxPagesToShow;
        } else if (currentPage >= totalPages - Math.floor(maxPagesToShow / 2)) {
            startPage = totalPages - maxPagesToShow + 1;
            endPage = totalPages;
        } else {
            startPage = currentPage - Math.floor(maxPagesToShow / 2);
            endPage = currentPage + Math.floor(maxPagesToShow / 2);
        }
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }
    }
    return pageNumbers;
}

function generatePageParamsAndFilterParams(filterParams, pageNumber, pageSize) {
    const httpParams = {
        p: pageNumber,
        s: pageSize
    };
    Object.keys(filterParams).forEach(function (key) {
        let value = filterParams[key];
        if (value === 'string') {
            value = value.trim();
        }
        if (value !== '') {
            httpParams[key] = value;
        }
    });
    return httpParams;
}
function showErrorToast(caption, text){
    const errorToast = document.getElementById('errorToast');
    errorToast.getElementsByClassName("error-text")[0].textContent = text;
    errorToast.getElementsByClassName("error-caption")[0].textContent = caption;
    bootstrap.Toast.getOrCreateInstance(errorToast).show();
}
function deleteItemAndGetNewPage(items, totalPages, currentPage, indexPredicate, getPage){
    const index = items.findIndex(indexPredicate);
    // Удаляем пользователя с найденным индексом
    if (index !== -1) {
        items.splice(index, 1);
        if(items.length === 0 && totalPages > 1){
            getPage(currentPage > 1 ? currentPage - 1 : 1);
        }
    }
}