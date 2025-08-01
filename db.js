const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // Replace with your database password
    database: 'c372_booklink', // Replace with your database name
    port: 3307
  })
