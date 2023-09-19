const mysql = require("mysql2");

const db = mysql.createPool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  dateStrings: process.env.DB_DATE_STRINGS,
});

module.exports = db.promise();
