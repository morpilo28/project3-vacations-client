"use strict";

var socket = io.connect('http://localhost:3201/');

socket.on('ADD_VACATION', onAddVacationEvent);

socket.on('DELETE_VACATION', onDeleteVacationEvent);

socket.on('EDIT_VACATION', onEditVacationEvent);

