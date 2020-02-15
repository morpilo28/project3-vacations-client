# Vacations App

### Client repository :
https://github.com/morpilo28/project3-vacations-client

### Server repository :
https://github.com/morpilo28/project3-vacations-server


## Project init

1. On both client and server run 'npm install'

2. The database management system used in this project is mysql. 
Create a new database called 'travel' in phpmyadmin and import the 'travel.sql' file (located in the server folder into it.

3. On both client and server run 'npm start'.

4. Navigate to http://localhost:8080/client.html


## Login info

   ### Admin
  ```
    User Name: mor
    Password: mor
  ```

   ### User
#### You can view all past signed users at the 'users' table (in the database) or you can register as a new user.

user example:

  ```
    User Name:  oz
    Password: oz
  ```

  ## Project hirarchi

client.js <-- (socket.io) --> Node.js (server.js --> routing (users-bl, vacations-bl) --> dal.js) --> MySQL Database

 ## Project Github Links
### Client:
https://github.com/morpilo28/project3-vacations-client

### Server:
https://github.com/morpilo28/project3-vacations-server
