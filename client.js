"use strict";

const app = {
    baseEndPoint: `http://localhost:3201/`,
    ImgBaseUrl: 'http://localhost:3201/images/',
    END_POINTS: {
        vacations: 'vacations',
        login: 'login',
        register: 'register',
        follow: 'follow',
        uploadImg: 'uploadImg'
    },
    METHODS: {
        GET: 'GET',
        POST: 'POST',
        DELETE: 'DELETE',
        PUT: 'PUT'
    },
    TOKEN_LOCAL_STORAGE_KEY: 'token',
};

init();

function init() {
    eventListeners();
    const userName = getUserName();
    if (!userName) {
        loginView();
    } else {
        const _isAdminLogged = isAdminLogged();
        if (_isAdminLogged === 'true') {
            addNavigationLink('nav', 'chart', 'Chart');
        }
        addNavigationLink('nav', 'logout', 'Logout');
        navigate('vacations');
    }
}

function getUserName() {
    return window.localStorage.getItem('userNameForTitle');
}

function isAdminLogged() {
    return window.localStorage.getItem('isAdmin');
}

function eventListeners() {
    onActiveEvent('click', '#chart', (e) => {
        e.preventDefault();
        navigate('chart');
    });

    onActiveEvent('click', '#logout', (e) => {
        e.preventDefault();
        navigate('logout');
    });

    onActiveEvent('click', '#vacations', (e) => {
        e.preventDefault();
        navigate('vacations');
    });

    onActiveEvent('click', "#imgPick", (e) => {
        e.preventDefault();
        if ($("#editImage").length > 0) {
            triggerFileInput('editImage');
        } else if ($("#addedImage").length > 0) {
            triggerFileInput('addedImage');
        }
    });

    onActiveEvent('change', "#addedImage", (e) => {
        e.preventDefault();
        printChangedBtnText('imgPick', 'Image has been chosen');
    });

    onActiveEvent('change', "#editImage", (e) => {
        e.preventDefault();
        printChangedBtnText('imgPick', 'Image has been changed');
    })
}

function navigate(url) {
    printToHtml('main', '');
    switch (url) {
        case 'login':
            loginView();
            break;
        case 'vacations':
            getVacationList();
            break;
        case 'logout':
            removeElement('chart');
            removeElement('vacations');
            window.localStorage.clear();
            navigate('login');
            removeElement('logout');
            break;
        case 'register':
            registerView();
            break;
        case 'chart':
            buildChart();
            break;
    }
}

function onActiveEvent(event, id, cb) {
    $(document).on(event, id, cb);
}

function triggerFileInput(id) {
    $(`#${id}`).trigger('click');
}

function printChangedBtnText(elementId, btnText) {
    $(`#${elementId}`).html(btnText);
}

function buildChart() {
    const userId = getUserId();
    httpRequests(app.END_POINTS.vacations + '?userId=' + userId + '&forChart=true', app.METHODS.GET).then(res => {
        removeElement('chart');
        removeElement('vacations');
        addNavigationLink('nav', 'vacations', 'Vacation List');
        if (res.length === 0) {
            printToHtml('main', `<h3><b>No vacation has been followed yet!</b></h3>`);
        } else {
            let numOfFollowers = [];
            let vacationsFollowed = [];
            for (let i = 0; i < res.length; i++) {
                let numOfFollowersToArray = Object.values(res[i]);
                numOfFollowers.push(numOfFollowersToArray[7]);
                vacationsFollowed.push(numOfFollowersToArray[0] + ' (' + numOfFollowersToArray[2] + ')');
            }
            let html = `<canvas id="myChart" style="display: block; height: 467px; width: 100%;"></canvas>`;
            printToHtml('main', html);
            var ctx = document.getElementById('myChart').getContext('2d');
            var chart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: vacationsFollowed,
                    datasets: [{
                        label: 'Number of Followers',
                        backgroundColor: 'coral',
                        data: numOfFollowers,
                    }]
                },
                options: {
                    scales: {
                        xAxes: [{
                            type: 'category',
                            labels: vacationsFollowed,
                        }],
                        yAxes: [{
                            display: true,
                            ticks: {
                                beginAtZero: true,
                                max: Math.max(...numOfFollowers),
                                min: 0,
                                stepSize: 1
                            }
                        }]
                    },
                }
            });
            Chart.defaults.global.defaultFontColor = 'white';
            Chart.defaults.global.defaultFontStyle = 'bold';
        }
    }).catch(status => {
        if (status === 500) {
            printToHtml('main', 'Internal Server Error');
        } else if (status === 401) {
            printToHtml('main', 'Area for members only! Please Login to show the list');
        } else {
            console.log(status);
        }
    });
}

function getUserId() {
    return window.localStorage.getItem('userId');
}

function getVacationList() {
    const userId = getUserId();
    httpRequests(app.END_POINTS.vacations + '?userId=' + userId, app.METHODS.GET).then(res => vacationListView(res)).catch(status => {
        if (status === 500) {
            printToHtml('main', 'Internal Server Error');
        } else if (status === 401) {
            printToHtml('main', 'Area for members only! Please Login to show the list');
        } else {
            console.log(status);
        }
    });
}

function httpRequests(endPoint, httpVerb, reqBody) {
    return new Promise((resolve, reject) => {
        let headers = {};

        if (!(reqBody instanceof FormData) || !reqBody) {
            headers = {'Content-Type': 'application/json'};
        }

        const token = getToken();
        if (token) {
            headers['Authorization'] = 'bearer ' + token;
        }

        const fetchOptions = {
            method: httpVerb,
            headers: headers,
        };

        if (httpVerb === app.METHODS.DELETE || httpVerb === app.METHODS.POST || httpVerb === app.METHODS.PUT && reqBody) {
            if (reqBody instanceof FormData) {
                fetchOptions['body'] = reqBody;
            } else {
                fetchOptions['body'] = JSON.stringify(reqBody);
            }
        }

        fetch(app.baseEndPoint + endPoint, fetchOptions).then(responseData => {
            let dataType = responseData.headers.get('content-type');
            if (responseData.status !== 200) {
                reject(responseData.status);
            }

            dataType = !dataType ? 'text/html; charset=utf-8' : dataType;
            if (dataType.indexOf('json') > -1) {
                responseData.json().then(res => resolve(res));
            } else if (dataType.indexOf('text') > -1) {
                responseData.text().then(res => resolve(res));
            } else {
                console.log('no match');
            }
        });
    })
}

function getToken() {
    return localStorage.getItem(app.TOKEN_LOCAL_STORAGE_KEY);
}

function vacationListView(vacations) {
    printUserName();
    const _isAdminLogged = isAdminLogged();
    if (_isAdminLogged === 'true') {
        adminView(vacations)
    } else {
        clientView(vacations);
    }
}

function printToHtml(id, html) {
    $('#' + id).empty();
    document.getElementById(id).innerHTML = html;
}

function deleteBtnEventListener(vacationId, singleVacationEndPoint) {
    $(`#deleteIcon${vacationId}`).on('click', (e) => {
        e.preventDefault();
        const data = {
            id: vacationId,
            userId: getUserId(),
            imageName: $(`#img${vacationId}`).attr('alt')
        };

        httpRequests(singleVacationEndPoint, app.METHODS.DELETE, data).then().catch(status => {
            if (status === 500) {
                printToHtml('main', 'Internal Server Error');
            } else if (status === 401) {
                printToHtml('main', 'Area for members only! Please Login to show the list');
            } else {
                console.log(status);
            }
        });
    });
}

function editBtnEventListener(vacationId, singleVacationEndPoint) {
    $(`#editIcon${vacationId}`).on('click', (e) => {
        e.preventDefault();
        paintModalElement(`saveChanges${vacationId}`, vacationId);
        onEditVacation(vacationId, singleVacationEndPoint);
    });
}

function createUniqueBtnEventListeners(vacationsArray) {
    $('#add').on('click', (e) => {
        e.preventDefault();
        paintModalElement('save');
    });

    for (let i = 0; i < vacationsArray.length; i++) {
        const id = vacationsArray[i].id;
        const singleVacationEndPoint = `vacations/${id}`;
        editBtnEventListener(id, singleVacationEndPoint);
        deleteBtnEventListener(id, singleVacationEndPoint);
    }
}

function onSaveAddedVacation() {
    const imageFile = (document.getElementById('addedImage')).files[0];
    if (imageFile) {
        const formData = createFormData(imageFile);
        let vacationToAdd = getVacationToAdd();
        let isEmpty = isValueEmpty(vacationToAdd);

        if (isEmpty === true) {
            printToHtml('modalHeader', "Can't save before filling out all the fields!");
        } else {
            let _isDateValid = isDateValid(vacationToAdd, false);
            if (_isDateValid) {
                httpRequests(app.END_POINTS.uploadImg, app.METHODS.POST, formData).then(imgFileName => {
                    vacationToAdd.image = imgFileName;
                    httpRequests(app.END_POINTS.vacations, app.METHODS.POST, vacationToAdd).then(res => {
                        closeModal();
                    }).catch(status => {
                        if (status === 500) {
                            printToHtml('main', 'Internal Server Error');
                        } else if (status === 401) {
                            printToHtml('main', 'Area for members only! Please Login to show the list');
                        } else if (status === 400) {
                            printToHtml('modalHeader', 'The added vacation already exist.');
                        } else {
                            console.log(status);
                        }
                    });
                }).catch(status => {
                    console.log(status);
                    printToHtml('modalHeader', 'File type not supported. Image type only.');
                });
            }
        }
    } else {
        printToHtml('modalHeader', "Please choose a picture!");
    }
}

function getVacationToAdd() {
    return {
        destination: document.getElementById(`addedDestination`).value,
        description: (document.getElementById(`addedDescription`).value).toLowerCase(),
        fromDate: document.getElementById(`addedFromDate`).value,
        toDate: document.getElementById(`addedToDate`).value,
        price: document.getElementById(`addedPrice`).value,
        followers: 0
    };
}

function isValueEmpty(vacationToAdd) {
    let isEmpty = false;
    Object.values(vacationToAdd).forEach(value => {
        if (value === '') {
            isEmpty = true
        }
    });
    return isEmpty;
}

function isDateValid(vacationToAdd, isOnEdit) {
    let today = new Date().setHours(0, 0, 0, 0);
    let fromDate = new Date(vacationToAdd.fromDate).setHours(0, 0, 0, 0);
    let toDate = new Date(vacationToAdd.toDate).setHours(0, 0, 0, 0);
    if (!isOnEdit) {
        if (fromDate < today) {
            printToHtml('modalHeader', '"From" date must be in the future');
            return false;
        }
    }
    if (toDate < today) {
        printToHtml('modalHeader', '"To" date must be in the future');
        return false;
    } else if (toDate < fromDate) {
        printToHtml('modalHeader', '"To" date must be after "From" date');
        return false;
    } else {
        return true;
    }
}

function onEditVacation(idx, singleVacationEndPoint) {
    $(`#saveChanges${idx}`).on('click', (e) => {
        e.preventDefault();
        let editedObjOldValues = getVacationToEdit(idx);
        let editedObj = getEditedObjNewValues(idx, editedObjOldValues);

        let isEmpty = isValueEmpty(editedObj);
        if (isEmpty === true) {
            printToHtml('modalHeader', "Can't save before filling out all the fields!");
        } else {
            let _isDateValid = isDateValid(editedObj, true);
            if (_isDateValid) {
                const imageFile = (document.getElementById(`editImage`)).files[0];
                if (imageFile) {
                    const formData = createFormData(imageFile);
                    httpRequests(app.END_POINTS.uploadImg, app.METHODS.POST, formData).then(imgFileName => {
                        editedObj.image = imgFileName;
                        editedObj.imageWasAdded = true;
                        httpRequests(singleVacationEndPoint, app.METHODS.PUT, editedObj).then(res => {
                            closeModal();
                        }).catch(status => {
                            if (status === 400) {
                                printToHtml('modalHeader', 'The vacation already exist.')
                            } else {
                                console.log(status)
                            }
                        });
                    }).catch(status => {
                        console.log(status);
                        printToHtml('modalHeader', 'File type not supported. Image type only.');
                    });
                } else {
                    editedObj.image = jQuery(`#img${idx}`).attr('alt');
                    httpRequests(singleVacationEndPoint, app.METHODS.PUT, editedObj).then(res => {
                        closeModal();
                    }).catch(status => {
                        if (status === 500) {
                            printToHtml('main', 'Internal Server Error');
                        } else if (status === 401) {
                            printToHtml('main', 'Area for members only! Please Login to show the list');
                        } else if (status === 400) {
                            printToHtml('modalHeader', 'The vacation already exist.');
                        } else {
                            console.log(status);
                        }
                    });
                }
            }
        }
    });
}

function getVacationToEdit(objToUpdateId) {
    return {
        destination: $(`#destination${objToUpdateId}`).text(),
        description: $(`#description${objToUpdateId}`).text(),
        price: $(`#price${objToUpdateId}`).text().slice(0, -1),
        image: $(`#img${objToUpdateId}`).attr('alt'),
        fromDate: $(`#fromDate${objToUpdateId}`).text(),
        toDate: $(`#toDate${objToUpdateId}`).text(),
        followers: $(`#adminFollowersBtn${objToUpdateId}`).attr('value')
    };
}

function getEditedObjNewValues(idx, editedObjOldValues) {
    return {
        id: idx,
        destination: jQuery(`#editDestination`).val(),
        description: jQuery(`#editDescription`).val().toLowerCase(),
        fromDate: jQuery(`#editFromDate`).val(),
        toDate: jQuery(`#editToDate`).val(),
        price: jQuery(`#editPrice`).val(),
        followers: jQuery(`#editFollowers`).val(),
        userId: getUserId(),
        originalObjToEdit: editedObjOldValues
    };
}

function createFormData(imageFile) {
    const formData = new FormData();
    formData.append('imgFile', imageFile);

    return formData;
}

function registerView(note) {
    note = note ? note : '';
    const html = `

    <div class="form-signin">
        <h1 class="h3 mb-3 font-weight-normal text-center"><b>Register</b></h1>
        <b><p>${note}</p></b>
        <label for="firstName" class="sr-only">First Name</label>
        <input type="text" id='firstName' class="form-control" placeholder="First Name" required="" autofocus="">

        <label for="lastName" class="sr-only">Last Name</label>
        <input type="text" id='lastName' class="form-control" placeholder="Last Name" required="" autofocus="">

        <label for="userName" class="sr-only">User Name</label>
        <input type="text" id='userName' class="form-control" placeholder="User Name" required="" autofocus="">

        <label for="password" class="sr-only">Password</label>
        <input type="password" id="password" class="form-control" placeholder="Password" required=""></br>
        <button class="btn btn-lg btn-primary btn-block" id='register' type="submit">Register</button></br>
        <p class='text-center'><b><u>Already a member? <a id='loginPage' href='login'>Login Here!</u></b></a>
  </div>`;
    printToHtml('main', html);
    document.getElementById('register').addEventListener('click', register);
    document.getElementById('loginPage').addEventListener('click', (e) => {
        e.preventDefault();
        navigate('login');
    });
}

function register() {
    const params = {
        firstName: document.getElementById('firstName').value,
        lastName: document.getElementById('lastName').value,
        userName: document.getElementById('userName').value,
        password: document.getElementById('password').value,
        isAdmin: 'false',
    };

    httpRequests(app.END_POINTS.register, app.METHODS.POST, params).then(res => {
        const idArray = ['firstName', 'lastName', 'userName', 'password'];
        for (let i = 0; i < idArray.length; i++) {
            emptyInputs(idArray[i]);
        }
        navigate('login');
    }).catch(status => {
        if (status === 400) {
            registerView('user name taken. please select a different name');
        } else {
            console.log(status);
        }
    });
}

function emptyInputs(id) {
    document.getElementById(id).value = '';
}

function loginView(note) {
    printUserName();
    note = note ? note : '';
    const html = `

    <div class="form-signin">
        <h1 class="h3 mb-3 font-weight-normal text-center"><b>Please Login</b></h1>
        <b><p>${note}</p></b>
        <label for="userName" class="sr-only">User Name</label>
        <input type="text" id='userName' class="form-control" placeholder="User Name" required="" autofocus="">
        <label for="password" class="sr-only">Password</label>
        <input type="password" id="password" class="form-control" placeholder="Password" required="">
        <button class="btn btn-lg btn-primary btn-block" id='login' type="submit">Login</button></br>
        <p class='text-center'><b><u>Not yet a member? <a id='registerPage' href='register'>Register Here!</u></b></a>
  </div>`;
    printToHtml('main', html);
    document.getElementById('registerPage').addEventListener('click', (e) => {
        e.preventDefault();
        navigate('register');
    });
    document.getElementById('login').addEventListener('click', login);
}

function login() {
    const params = {
        userName: document.getElementById('userName').value,
        password: document.getElementById('password').value
    };
    httpRequests(app.END_POINTS.login, app.METHODS.POST, params).then(res => {
        emptyInputs('userName');
        emptyInputs('password');
        setItemInLocalStorage(app.TOKEN_LOCAL_STORAGE_KEY, res.token);
        setItemInLocalStorage('userNameForTitle', res.userName);
        setItemInLocalStorage('userId', res.userId);
        setItemInLocalStorage('isAdmin', res.isAdmin);
        addNavigationLink('nav', 'logout', 'Logout');
        if (res.isAdmin === 'true') {
            addNavigationLink('nav', 'chart', 'Chart');
        }
        navigate('vacations');
    }).catch(status => {
        if (status === 400) {
            loginView('User Not Found');
        } else {
            console.log(status);
        }
    })
}

function setItemInLocalStorage(key, value) {
    window.localStorage.setItem(key, value);
}

function printUserName() {
    const savedUserName = getUserName();
    if (!savedUserName) {
        printToHtml('userNameForTitle', `Hello <u>Guest</u>,`)
    } else {
        let userName = capitalizeFirstLetter(savedUserName);
        printToHtml('userNameForTitle', `Hello <u>${userName}</u>,`)
    }
}

function addNavigationLink(parentElementId, elementId, linkName) {
    $(`#${parentElementId}`).append(`<a id=${elementId} href="">${linkName}</a>`);
}

function clientView(vacations) {
    let allVacations = vacations.organizedVacationArray;
    let followedVacations = vacations.userFollowedVacationsIds;

    if (allVacations.length === 0) {
        printToHtml('main', `<h3><b> No vacations have been found!</b></h3>`);
    } else {
        let html = `<div id="vacationList">`;
        let isFollowed = 'unFollowBtnColor';
        for (let i = 0; i < allVacations.length; i++) {
            for (let j = 0; j < followedVacations.length; j++) {
                isFollowed = 'unFollowBtnColor';
                if (followedVacations[j] === allVacations[i].id) {
                    isFollowed = 'followBtnColor';
                    break;
                }
            }

            html += createClientCard(allVacations[i], isFollowed);
        }
        html += `</div>`;
        printToHtml('main', html);

        for (let i = 0; i < allVacations.length; i++) {
            followBtnListener(allVacations[i]);
        }
    }
}

function createClientCard(vacation, isFollowed) {
    let destinationName = capitalizeFirstLetter(vacation.destination);
    return `<div id="${vacation.id}" class='card'>
                <img id="img${vacation.id}" width='100%' height='150' src="${app.ImgBaseUrl + vacation.image}" alt="${vacation.image}"/>
                <div id="destination${vacation.id}"><b>${destinationName}</b></div>
                <textarea readonly id="description${vacation.id}" class="cardTextArea">${vacation.description}</textarea>
                <div id="price${vacation.id}">${vacation.price}$</div>
                <div>
                    <div>From: <span id="fromDate${vacation.id}">${vacation.fromDate}</span></div> 
                    <div>To: <span id="toDate${vacation.id}">${vacation.toDate}</span></div>
                </div>
                <button type="button" id='followBtn${vacation.id}' class="btn btnFollowPosition btn-primary btn-circle ${isFollowed} ">f</button>
                <button id="clientFollowersBtn${vacation.id}" class="btnFollowersPosition btn btn-info btn-circle disabled unFollowBtnColor">${vacation.followers}</button>
            </div>`;
}

function adminView(vacationsArray) {
    removeElement('chart');
    removeElement('vacations');
    addNavigationLink('nav', 'chart', 'Chart');
    const vacations = vacationsArray.organizedVacationArray ? vacationsArray.organizedVacationArray : vacationsArray;
    let html = `
    <h3 id='vacationListNote'> </h3>
    <button id='add'>Add Vacation</button>
    <div id='vacationList'>`;

    if (vacations.length === 0) {
        printToHtml('main', html);
        printToHtml('vacationListNote', `<b>no vacations has been found</b>`);
        createUniqueBtnEventListeners(vacations);
    } else {
        for (let i = 0; i < vacations.length; i++) {
            html += createAdminCard(vacations[i]);
        }
        html += `</div>`;
        printToHtml('main', html);
        createUniqueBtnEventListeners(vacations);
    }
}

function createAdminCard(vacation) {
    let destinationName = capitalizeFirstLetter(vacation.destination);
    return `<div id="${vacation.id}" class='card'>
                <img id="img${vacation.id}" width='100%' height='150' src="${app.ImgBaseUrl + vacation.image}" alt="${vacation.image}"/>
                <button type="button" class="btn btnDelete btn-primary btn-circle "><i id='deleteIcon${vacation.id}' class='fas fa-times'></i></button>
                <button type="button" class="btn btnEdit btn-primary btn-circle"><i id='editIcon${vacation.id}' class="fas fa-pencil-alt"></i></button> 
                <input hidden value='${vacation.id}'/>
                <div id="destination${vacation.id}"><b>${destinationName}</b></div>
                <textarea readonly id="description${vacation.id}" class="cardTextArea">${vacation.description}</textarea>
                <div id="price${vacation.id}">${vacation.price}$</div>
                <div>
                   <div>From: <span id="fromDate${vacation.id}">${vacation.fromDate}</span></div> 
                    <div>To: <span id="toDate${vacation.id}">${vacation.toDate}</span></div>
                </div>
                <input hidden id="adminFollowersBtn${vacation.id}" value='${vacation.followers}' />
             </div>`;
}

function followBtnListener(vacation) {
    document.getElementById(`followBtn${vacation.id}`).addEventListener('click', (e) => {
        e.preventDefault();
        addToFollowDb(vacation.id);
    })
}

function addToFollowDb(vacationId) {
    const followObjToAdd = {
        userId: getUserId(),
        vacationId: vacationId
    };
    httpRequests(app.END_POINTS.follow, app.METHODS.POST, followObjToAdd).then(res => {
        if (res.isFollowed === true) {
            $(`#followBtn${res.vacationId}`).toggleClass('unFollowBtnColor followBtnColor');
            updateFollowersCount(res.vacationId, 'add');
        } else {
            $(`#followBtn${res.vacationId}`).toggleClass('followBtnColor unFollowBtnColor');
            updateFollowersCount(res.vacationId, 'reduce');
        }
    }).catch(status => {
        if (status === 400) {
            alert('vacation already been followed');
        } else {
            console.log(status);
        }
    });
}

function updateFollowersCount(vacationId, reduceOrAdd) {
    const reqBody = {
        userId: getUserId(),
        id: vacationId,
        reduceOrAdd: reduceOrAdd
    };
    httpRequests(app.END_POINTS.vacations + '/' + vacationId, app.METHODS.PUT, reqBody).then(res => {
        navigate('vacations');
    }).catch(status => {
        console.log(status);
    });
}

function removeElement(elementToRemoveId) {
    $(`#${elementToRemoveId}`).remove();
}

function paintModalElement(saveId, objToUpdateId) {
    let modalBody = `<div class="modal-body">`;
    if (objToUpdateId) {
        modalBody = modalBodyForUpdate(modalBody, objToUpdateId, saveId);
    } else {
        modalBody = modalBodyForAdd(modalBody);
    }
    $('#main').append(`  
    <div id='modalElement'>
        <div id="myModal" class="modal" role="dialog" data-backdrop="static" data-keyboard="false">
            <div class="modal-dialog modal-sm">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h4 id='modalHeader' class="modal-title">Please fill out all the fields</h4>
                        </div>
                        <form id='addedVacationForm'>
                            <div>
                                ${modalBody}
                            </div>
                            <div class="modal-footer">
                                <button type="submit" class="closeBtn btn btn-default" id='${saveId}'>Save</button>
                                <button type="button" class="closeBtn btn btn-default" id='close'>Close</button>
                            </div>
                        </form>
                </div>
            </div>
        </div>
    </div>`);

    if (saveId === "save") {
        $(`#save`).on('click', (e) => {
            e.preventDefault();
            onSaveAddedVacation();
        });
    }

    $(`#close`).on('click', (e) => {
        e.preventDefault();
        closeModal();
    });

    displayVacationModal();
}

function modalBodyForAdd(modalBody) {
    const minDate = getTodayDateStr();

    modalBody += `
            <button id="imgPick" style="cursor:pointer">Choose an Image</button> 
            <input type="file" id='addedImage' required style="display:none"/><br><br>
            <label>Destination: <input id='addedDestination' required type='text'></label><br>
            <label>Description: <textarea id='addedDescription' required type='text'></textarea></label><br>
            <label>From: <input id='addedFromDate' required type='date' min='${minDate}'></label><br>
            <label>To: <input id='addedToDate' required type='date' min='${minDate}'></label><br>
            <label>Price: <input id='addedPrice' required type='number' min='0'></label><br>`;
    return modalBody;
}

function modalBodyForUpdate(modalBody, objToUpdateId) {
    let objToEdit = getVacationToEdit(objToUpdateId);
    let fullFromDateStr = formatDate(objToEdit.fromDate);
    let fullToDateStr = formatDate(objToEdit.toDate);
    const minDate = getTodayDateStr();

    modalBody += `
        <button id="imgPick" style="cursor:pointer">Change Image</button> 
        <input type="file" id='editImage' value='${objToEdit.image}' style="display:none"/><br><br>
        <label>Destination: <input id='editDestination' required type='text' value='${objToEdit.destination}'></label><br>
        <label>Description: <textarea id='editDescription' required type='text'>${objToEdit.description}</textarea></label><br>
        <label>From: <input id='editFromDate' required type='date' min='${minDate}' value='${fullFromDateStr}'></label><br>
        <label>To: <input id='editToDate' required type='date' min='${minDate}' value='${fullToDateStr}'></label><br>
        <label>Price: <input id='editPrice' required type='number' min='0' value='${objToEdit.price}'></label><br>
        <input hidden id='editFollowers' value='${objToEdit.followers}'/>
        `;
    return modalBody;
}

function formatDate(dateToFormat) {
    let [day, month, year] = dateToFormat.split('-');
    return year + '-' + month + '-' + day;
}

function getTodayDateStr() {
    const date = new Date();
    return date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
}

function closeModal() {
    $('#myModal').modal('hide');
    removeElement('modalElement');
}

function displayVacationModal() {
    $('#myModal').modal('show');
}

function onAddVacationEvent(createdVacation) {
    console.log('added');
    addVacationToView(createdVacation);
}

function addVacationToView(vacation) {
    const _isAdminLogged = isAdminLogged();
    if (_isAdminLogged === 'true') {
        let singleEndPoint = `vacations/${vacation.id}`;
        let html = createAdminCard(vacation);
        $('#vacationList').append(html);
        deleteBtnEventListener(vacation.id, singleEndPoint);
        editBtnEventListener(vacation.id, singleEndPoint);
    } else if (_isAdminLogged === 'false') {
        let html = createClientCard(vacation, 'unFollowBtnColor');
        $('#vacationList').append(html);
        followBtnListener(vacation);
    }
}

function onEditVacationEvent(newEditedVacationValues) {
    // const _isAdminLogged = isAdminLogged();
    // if (_isAdminLogged === 'true') {
    //
    // } else if (_isAdminLogged === 'false') {
    //
    // }

    console.log('edited');
    let destinationName = capitalizeFirstLetter(newEditedVacationValues.destination);
    $(`#destination${newEditedVacationValues.id}`).replaceWith(`<div id="destination${newEditedVacationValues.id}"><b>${destinationName}</b></div>`);
    $(`#description${newEditedVacationValues.id}`).text(newEditedVacationValues.description);
    $(`#price${newEditedVacationValues.id}`).text(`${newEditedVacationValues.price}$`);
    $(`#img${newEditedVacationValues.id}`).attr("src", `${app.ImgBaseUrl + newEditedVacationValues.image}`).attr("alt", newEditedVacationValues.image);
    $(`#fromDate${newEditedVacationValues.id}`).text(newEditedVacationValues.fromDate);
    $(`#toDate${newEditedVacationValues.id}`).text(newEditedVacationValues.toDate);
    $(`#clientFollowersBtn${newEditedVacationValues.id}`).text(newEditedVacationValues.followers);
    $(`#adminFollowersBtn${newEditedVacationValues.id}`).attr('value', newEditedVacationValues.followers);
}

function onDeleteVacationEvent(deletedVacationId) {
    console.log('deleted');
    removeElement(deletedVacationId.id);
}

function capitalizeFirstLetter(str) {
    str = str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    return str;
}