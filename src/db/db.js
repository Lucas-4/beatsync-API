const mysql = require("mysql2");
const fs = require("fs");
let db;

if (process.env.NODE_ENV === "development") {
    db = mysql.createPool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT,
        dateStrings: process.env.DB_DATE_STRINGS,
    });
} else {
    db = mysql.createPool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        port: process.env.DB_PORT,
        ssl: {
            ca: fs.readFileSync("src/db/DigiCertGlobalRootCA.crt.pem", "utf-8"),
        },
        dateStrings: process.env.DB_DATE_STRINGS,
    });
}
module.exports = db.promise();
