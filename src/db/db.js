const mysql = require("mysql2");

let db;

if (process.env.NODE_ENV === "development") {
  db = mysql.createPool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    dateStrings: process.env.DB_DATE_STRINGS,
  });
} else {
  db = mysql.createPool(process.env.CLEARDB_DATABASE_URL);
}

module.exports = db.promise();
