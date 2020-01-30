"use strict";
//TODO: when displaying cards, show img from server images folder - fix src url;
//TODO: when uploading img check if exist. if so don't add again (probably will need to change uploaded file saved name);
//TODO: check if dates is ok and no problems;
//TODO: is there any place to use /vacation/:id?!;
//TODO: fix chart section;
//TODO: change lower case to upper case or vice versa if needed (for example in: registration/login, adding/updating a vacation, etc.);
//TODO: make adding an image (when adding a vacation) possible;
//TODO: design;
//TODO: needs to check for duplicate code;

const app = {
    baseEndPoint: `http://localhost:3201/`,
    serverImgBaseUrl: 'http://localhost:3201/images/',
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
    navbarEventListeners();

    if (!window.localStorage.getItem('userNameForTitle')) {
        loginView();
    } else {
        if (window.localStorage.getItem('isAdmin') === 'true') {
            addChartNavigationLink();
        }
        showVacationList();
    }
}

function navbarEventListeners() {
    const links = document.querySelectorAll('#nav a[data-href]');
    for (let i = 0; i < links.length; i++) {
        links[i].addEventListener('click', (e) => {
            e.preventDefault();
            navigate(e.target.dataset.href);
        })
    }

    $(document).on('click', '#chart', (e) => {
        e.preventDefault();
        buildChart();
    });

}

function navigate(url) {
    printToHtml('main', '');
    switch (url) {
        case 'login':
            loginView();
            break;
        case 'vacations':
            showVacationList();
            break;
        case 'logout':
            $('#chart').remove();
            window.localStorage.clear();
            navigate('login');
            break;
    }
}

function buildChart() {
    const userId = getUserId();
    httpRequests(app.END_POINTS.vacations + '?userId=' + userId + '&forChart=true', app.METHODS.GET).then(res => {
        let numOfFollowers = [];
        let vacationsFollowed = [];
        for (let i = 0; i < res.length; i++) {
            let numOfFollowersToArray = Object.values(res[i]);
            numOfFollowers.push(numOfFollowersToArray[7]);
            vacationsFollowed.push(numOfFollowersToArray[0] + '-' + numOfFollowersToArray[2]);
        }
        // TODO: try to make the y labels be according to the followers value or make a min-max labels;
        // numOfFollowers = numOfFollowers.sort((a, b) => a - b).reverse(); 
        let html = `<canvas id="myChart" style="display: block; height: 467px; width: 935px;"></canvas>`;
        printToHtml('main', html);
        var ctx = document.getElementById('myChart').getContext('2d');
        var chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: vacationsFollowed, //vacations followed Id's
                datasets: [{
                    label: 'Number of Followers',
                    backgroundColor: 'coral',
                    data: numOfFollowers, // number of followers
                }]
            },
            options: {
                scales: {
                    xAxes: [{
                        type: 'category',
                        labels: vacationsFollowed,
                    }],
                    yAxes: [{
                        type: 'category',
                        labels: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0], //needs to set is dynamically
                    }]
                },
            }
        });
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

function showVacationList() {
    const userId = getUserId();
    httpRequests(app.END_POINTS.vacations + '?userId=' + userId, app.METHODS.GET).then(res => vacationListView(res)).catch(status => {
        if (status === 500) {
            printToHtml('main', 'Internal Server Error');
        } else {
            console.log(status);
        }
    });
}

function httpRequests(endPoint, httpVerb, reqBody) {
    return new Promise((resolve, reject) => {
        let headers = {};

        if (!(reqBody instanceof FormData) || !reqBody) {
            headers = { 'Content-Type': 'application/json' };
        }

        // TODO: if content type is set to 'multipart/form-data' - then it creates the error "Multipart: Boundary not found"
        //const headers = reqBody instanceof FormData? { 'Content-Type': 'multipart/form-data' } : { 'Content-Type': 'application/json'}

        if (localStorage.getItem(app.TOKEN_LOCAL_STORAGE_KEY)) {
            headers['Authorization'] = 'bearer ' + localStorage.getItem(app.TOKEN_LOCAL_STORAGE_KEY);
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
            //TODO: what happens when dataType is null (admin.js:264 Uncaught (in promise) TypeError: Cannot read property 'indexOf' of null)
            //TODO: check if this next statement is suitable to address the problem of null data type

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

function vacationListView(vacations) {
    showUserName();
    if (window.localStorage.getItem('isAdmin') === 'true') {
        adminView(vacations)
    } else {
        clientView(vacations);
    }
}

function printToHtml(id, html) {
    $('#' + id).empty();
    document.getElementById(id).innerHTML = html;
}

function deleteBtnEventListener(id, singleVacationEndPoint) {
    $(`#deleteIcon${id}`).on('click', (e) => {
        e.preventDefault();
        const data = {
            id: e.target.id.slice(10),
            userId: getUserId()
        };

        httpRequests(singleVacationEndPoint, app.METHODS.DELETE, data).then().catch(status => {
            if (status === 500) {
                printToHtml('main', 'Internal Server Error')
            } else {
                console.log(status);
            }
        });
    });
}

function editBtnEventListener(vacationId, obj, singleVacationEndPoint) {
    $(`#editIcon${vacationId}`).on('click', (e) => {
        e.preventDefault();
        const id = e.target.id.slice(8);
        const objToUpdate = obj;
        paintModalElement(`saveChanges${id}`, objToUpdate);
        onEditVacation(id, singleVacationEndPoint, objToUpdate.followers);
    });
}

function addBtnEventListeners(vacationsArray) {
    $('#add').on('click', (e) => {
        e.preventDefault();
        paintModalElement('save');
    });

    for (let i = 0; i < vacationsArray.length; i++) {
        const id = vacationsArray[i].id;
        const singleVacationEndPoint = `vacations/${id}`;
        editBtnEventListener(id, vacationsArray[i], singleVacationEndPoint);
        deleteBtnEventListener(id, singleVacationEndPoint);
    }
}

function isDateValid(vacationToAdd) {
    let today = new Date().setHours(0, 0, 0, 0);
    let fromDate = new Date(vacationToAdd.fromDate).setHours(0, 0, 0, 0);
    let toDate = new Date(vacationToAdd.toDate).setHours(0, 0, 0, 0);
    if (fromDate < today) {
        printToHtml('modalHeader', '"From" date must be in the future');
        return false;
    } else if (toDate < today) {
        printToHtml('modalHeader', '"To" date must be in the future');
        return false;
    } else if (toDate < fromDate) {
        printToHtml('modalHeader', '"To" date must be after "From" date');
        return false;
    } else {
        return true;
    }
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

function onSaveAddedVacation() {
    const imageFile = (document.getElementById('addedImage')).files[0];
    if(imageFile){
        const formData = createFormData(imageFile);
        const imgNameForDb = addTimeStampToImgName(imageFile);
    
        const vacationToAdd = {
            destination: document.getElementById(`addedDestination`).value,
            description: (document.getElementById(`addedDescription`).value).toLowerCase(),
            image: imgNameForDb,
            fromDate: document.getElementById(`addedFromDate`).value,
            toDate: document.getElementById(`addedToDate`).value,
            price: document.getElementById(`addedPrice`).value,
            followers: 0
        };
        let isEmpty = isValueEmpty(vacationToAdd);
    
        if (isEmpty === true) {
            printToHtml('modalHeader', "Can't save before filling out all the fields!");
        } else {
            let isDateValidBoolean = isDateValid(vacationToAdd);
            if (isDateValidBoolean) {
                httpRequests(app.END_POINTS.uploadImg, app.METHODS.POST, formData).then().catch(status => console.log(status));
                httpRequests(app.END_POINTS.vacations, app.METHODS.POST, vacationToAdd).then(createdVacation => {
                    closeModal();
                }).catch(status => {
                    if (status === 500) {
                        printToHtml('main', 'Internal Server Error')
                    } else if (status === 400) {
                        printToHtml('modalHeader', 'The added vacation already exist.')
                    } else {
                        console.log(status);
                    }
                });
            }
        }
    }else{
        printToHtml('modalHeader', "Please choose a picture!");
    }
    
    
}

function addTimeStampToImgName(imageFile) {
    const imgFileNameWithExtension = imageFile.name;
    //TODO: try catch - if file name consist of dots (beyond the extension dot).
    const imgNameWithoutExtension = imgFileNameWithExtension.substr(0, imgFileNameWithExtension.lastIndexOf('.'));
    const imgExtension = imgFileNameWithExtension.split('.').pop();

    return imgNameWithoutExtension + '-' + Date.now() + '.' + imgExtension;
}

function onEditVacation(idx, singleVacationEndPoint, followers) {
    $(`#saveChanges${idx}`).on('click', (e) => {
        e.preventDefault();
        const imageFile = (document.getElementById(`editImage`)).files[0];
        if (imageFile) {
            const formData = createFormData(imageFile);
            const imgNameForDb = addTimeStampToImgName(imageFile);

            let editedObj = {
                id: idx,
                destination: jQuery(`#editDestination`).val(),
                description: jQuery(`#editDescription`).val().toLowerCase(),
                image: imgNameForDb,
                fromDate: jQuery(`#editFromDate`).val(),
                toDate: jQuery(`#editToDate`).val(),
                price: Number(jQuery(`#editPrice`).val()),
                followers: followers,
                userId: getUserId()
            };

            let isEmpty = isValueEmpty(editedObj);
            if (isEmpty === true) {
                printToHtml('modalHeader', "Can't save before filling out all the fields!");
            } else {
                let isDateValidBoolean = isDateValid(editedObj);
                if (isDateValidBoolean) {
                    httpRequests(app.END_POINTS.uploadImg, app.METHODS.POST, formData).then().catch(status => console.log(status));
                    httpRequests(singleVacationEndPoint, app.METHODS.PUT, editedObj).then(res => {
                        closeModal();
                        // vacationListView(res);
                    }).catch(status => {
                        if (status === 500) {

                        } else {
                            console.log(status);
                        }
                    });
                }
            }
        } else {
            printToHtml('modalHeader', "Please choose a picture!");
        }
    });
}

function createFormData(imageFile){
    const formData = new FormData();
    formData.append('imgFile', imageFile);
    
    return formData;
}

//TODO: see if it's needed
function onMoreDetails(res) {
    let html = `
            <div>
                <img width='200' src="./styles/images/${res.singleVacationData.image}" alt="${res.singleVacationData.image}"/>
                <br><br>
                description: ${res.singleVacationData.description}
                <br><br>
                destination: ${res.singleVacationData.destination}
                <br><br>
                from: ${res.singleVacationData.fromDate}
                <br><br>
                To: ${res.singleVacationData.toDate}
                <br><br>
                price: ${res.singleVacationData.price}
                <br><br>
                <button id='returnToFullList'>Return To Full List</button>
            </div>
            `;
    printToHtml('main', html);

    document.getElementById('returnToFullList').addEventListener('click', (e) => {
        e.preventDefault();
        vacationListView(res.allVacations);
    })
}

function registerView(note) {
    note = note ? note : '';
    const html = `
    <h2>Register</h2>
    <p>${note}</p>
    <div>
        <label>First Name: <input id='firstName'></label>
        <label>Last Name: <input id='lastName'></label>
        <label>User Name: <input id='userName'></label>
        <label>Password: <input id='password' type='password'></label>
        <div>  
            <button id='register'>Register</button>
        </div>
    </div>
    `;
    printToHtml('main', html);
    document.getElementById('register').addEventListener('click', register);
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
        console.log(status);
        if (status === 400) {
            registerView('user name taken. please select a different name');
        } else {
            console.log(status);
        }
    });
}

function loginView(note) {
    showUserName();
    note = note ? note : '';
    const html = `
    <div>
    <h2>Login</h2>
    <p>${note}</p>
        <label>User Name: <input id='userName'></label>
        <label>Password: <input id='password' type='password'></label>
        <button id='login'>Login</button>
        <p><u>Not yet a member? <a id='register' href='register'>Register Here!</u></a>
    </div>
    `;
    printToHtml('main', html);
    document.getElementById('register').addEventListener('click', (e) => {
        e.preventDefault();
        registerView();
    });
    document.getElementById('login').addEventListener('click', loginValidation);
}

function showUserName() {
    const savedUserName = window.localStorage.getItem('userNameForTitle');
    if (!savedUserName) {
        document.getElementById('userNameForTitle').innerHTML = `Hello Guest,`;
    } else {
        document.getElementById('userNameForTitle').innerHTML = `Hello ${(savedUserName).charAt(0).toUpperCase() + savedUserName.slice(1)},`;
    }
}

function loginValidation() {
    const params = {
        userName: document.getElementById('userName').value,
        password: document.getElementById('password').value
    };
    httpRequests(app.END_POINTS.login, app.METHODS.POST, params).then(res => {
        emptyInputs('userName');
        emptyInputs('password');
        window.localStorage.setItem(app.TOKEN_LOCAL_STORAGE_KEY, res.token);
        window.localStorage.setItem('userNameForTitle', res.userName);
        window.localStorage.setItem('userId', res.userId);
        window.localStorage.setItem('isAdmin', res.isAdmin);
        if (res.isAdmin === 'true') {
            addChartNavigationLink();
        }
        navigate('vacations');
    }).catch(status => {
        console.log(status);
        if (status === 400) {
            loginView('User Not Found');
        } else {
            console.log(status);
        }
    })
}

function addChartNavigationLink() {
    $('#nav').append(` <a id='chart' data-href="chart" href=""> | Chart</a>`);
}

function emptyInputs(id) {
    document.getElementById(id).value = '';
}

function followBtnListener(vacation) {
    document.getElementById(`followBtn${vacation.id}`).addEventListener('click', (e) => {
        e.preventDefault();
        const vacationId = e.target.id.slice(9);
        //TODO: cancel the green color after pressed btn;
        addToFollowDb(vacationId);
    })
}

function clientView(vacations) {
    let allVacations = vacations.organizedVacationArray;
    let followedVacations = vacations.userFollowedVacationsIds;

    if (allVacations.length === 0) {
        printToHtml('main', 'No vacations have been found!');
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

function addToFollowDb(vacationId) {
    const followObjToAdd = {
        userId: getUserId(),
        vacationId: vacationId
    };
    //TODO: make btn background color yellow
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
    httpRequests(app.END_POINTS.vacations + '/' + vacationId, app.METHODS.PUT, reqBody).then().catch(status => {
        console.log(status);
    });
}

function adminView(vacationsArray) {
    const vacations = vacationsArray.organizedVacationArray ? vacationsArray.organizedVacationArray : vacationsArray;
    let html = `
    <h3 id='vacationListNote'> </h3>
    <button id='add'>Add Vacation</button>
    <div id='vacationList'>`;

    if (vacations.length === 0) {
        printToHtml('main', html);
        printToHtml('vacationListNote', 'no vacations has been found');
        addBtnEventListeners(vacations);
    } else {
        for (let i = 0; i < vacations.length; i++) {
            html += createAdminCard(vacations[i]);
        }
        html += `</div>`;
        printToHtml('main', html);
        addBtnEventListeners(vacations);
    }
}

function paintModalElement(saveId, objToUpdate) {
    let modalBody = `<div class="modal-body">`;
    if (objToUpdate) {
        modalBody = modalBodyForUpdate(modalBody, objToUpdate.id, saveId);
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
    const minDate =  getTodayDateStr();

    modalBody += `
            <label>Image: <br/>
                <input id='addedImage' required type='file'><br/>
            </label><br>
            <label>Destination: <input id='addedDestination' required type='text'></label><br>
            <label>Description: <textarea id='addedDescription' required type='text'></textarea></label><br>
            <label>From: <input id='addedFromDate' required type='date' min='${minDate}'></label><br>
            <label>To: <input id='addedToDate' required type='date' min='${minDate}'></label><br>
            <label>Price: <input id='addedPrice' required type='number' min='0'></label><br>`;
    return modalBody;
    /* <label>Image: <input id='addedImage' required type='text'></label><br> */
}

function getTodayDateStr() {
    const date = new Date();
    const dateFormatted = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) + '-' + ('0' + date.getDate()).slice(-2);
    return dateFormatted;
}

function modalBodyForUpdate(modalBody, objToUpdateId) {
    let objToEdit = {
        destination: $(`#destination${objToUpdateId}`).text(),
        description: $(`#description${objToUpdateId}`).text(),
        price: $(`#price${objToUpdateId}`).text().slice(0, -1),
        image: $(`#img${objToUpdateId}`).attr('alt'),
        fromDate: $(`#fromDate${objToUpdateId}`).text(),
        toDate: $(`#toDate${objToUpdateId}`).text(),
    };

    let fullFromDateStr = formatDate(objToEdit.fromDate);
    let fullToDateStr = formatDate(objToEdit.toDate);
    const minDate =  getTodayDateStr();
    
    modalBody += `
        <label>Image: <br/>
            <input id='editImage' required type='file' value='${objToEdit.image}'>
        </label><br>
        <label>Destination: <input id='editDestination' required type='text' value='${objToEdit.destination}'></label><br>
        <label>Description: <textarea id='editDescription' required type='text'>${objToEdit.description}</textarea></label><br>
        <label>From: <input id='editFromDate' required type='date' min='${minDate}' value='${fullFromDateStr}'></label><br>
        <label>To: <input id='editToDate' required type='date' min='${minDate}' value='${fullToDateStr}'></label><br>
        <label>Price: <input id='editPrice' required type='number' min='0' value='${objToEdit.price}'></label><br>
        `;
    return modalBody;
}

function formatDate(dateToFormat) {
    let [day, month, year] = dateToFormat.split('-');
    const fullDateStr = year +'-'+ month +'-'+ day;
    return fullDateStr;
}

function closeModal() {
    $('#myModal').modal('hide');
    $('#modalElement').remove();
}

function displayVacationModal() {
    $('#myModal').modal('show');
}

function onAddVacationEvent(createdVacation) {
    console.log('add');
    addVacationToView(createdVacation);
}

function addVacationToView(vacation) {
    if (window.localStorage.getItem('isAdmin') === 'true') {
        let singleEndPoint = `vacations/${vacation.id}`;
        let html = createAdminCard(vacation);
        $('#vacationList').append(html);
        deleteBtnEventListener(vacation.id, singleEndPoint);
        editBtnEventListener(vacation.id, vacation, singleEndPoint);
    } else if (window.localStorage.getItem('isAdmin') === 'false') {
        let html = createClientCard(vacation, 'unFollowBtnColor');
        $('#vacationList').append(html);
        followBtnListener(vacation);
    }
}

function createAdminCard(vacation) {
    //TODO: make img src attr go to server images folder - maybe: "${app.serverImgBaseUrl + vacation.image}"
    return `<div id="${vacation.id}" class='card'>
                 <i id='deleteIcon${vacation.id}' class='fas fa-times deleteIcon'></i>
                 <i id='editIcon${vacation.id}' class="fas fa-pencil-alt editIcon"></i>
                 <input hidden value='${vacation.id}'/>
                 <div id="destination${vacation.id}"><b>${vacation.destination}</b></div>
                 <textarea readonly id="description${vacation.id}" class="cardTextArea">${vacation.description}</textarea>
                 <div id="price${vacation.id}">${vacation.price}$</div>
                 <div>
                     <img id="img${vacation.id}" width='80' src="${app.serverImgBaseUrl + vacation.image}" alt="${vacation.image}"/>
                 </div>
                 <div>
                    <div>From: <span id="fromDate${vacation.id}">${vacation.fromDate}</span></div> 
                     <div>To: <span id="toDate${vacation.id}">${vacation.toDate}</span></div>
                 </div>
             </div>`;
}

function createClientCard(vacation, isFollowed) {
    return `<div id="${vacation.id}" class='card'>
                    <div id="destination${vacation.id}"><b>${vacation.destination}</b></div>
                    <div id="description${vacation.id}">${vacation.description}</div>
                    <div id="price${vacation.id}">${vacation.price}$</div>
                    <div>
                        <img id="img${vacation.id}" width='80' src="${app.serverImgBaseUrl + vacation.image}" alt="${vacation.image}"/>
                    </div>
                    <div>
                        <div>From: <span id="fromDate${vacation.id}">${vacation.fromDate}</span></div> 
                        <div>To: <span id="toDate${vacation.id}">${vacation.toDate}</span></div>
                    </div>
                    <button id='followBtn${vacation.id}' class="btnFollowPosition btn btn-success btn-circle btn-circle-sm m-1 ${isFollowed}">f</button>
                    <button id="followersBtn${vacation.id}" class="btnFollowersPosition btn btn-success  btn-circle-sm m-1">${vacation.followers}</button>
                </div>`;
                //./styles/images/${vacation.image}
}

function onEditVacationEvent(newEditedVacationValues) {
    console.log('edited');
    $(`#destination${newEditedVacationValues.id}`).replaceWith(`<div id="destination${newEditedVacationValues.id}"><b>${newEditedVacationValues.destination}</b></div>`);
    $(`#description${newEditedVacationValues.id}`).text(newEditedVacationValues.description);
    $(`#price${newEditedVacationValues.id}`).text(`${newEditedVacationValues.price}$`);
    $(`#img${newEditedVacationValues.id}`).attr("src", `${app.serverImgBaseUrl + newEditedVacationValues.image}`).attr("alt", newEditedVacationValues.image);
    $(`#fromDate${newEditedVacationValues.id}`).text(newEditedVacationValues.fromDate);
    $(`#toDate${newEditedVacationValues.id}`).text(newEditedVacationValues.toDate);
    $(`#followersBtn${newEditedVacationValues.id}`).text(newEditedVacationValues.followers);
}

function onDeleteVacationEvent(deletedVacationId) {
    console.log('deleted');
    $('#' + deletedVacationId.id).remove();
}
