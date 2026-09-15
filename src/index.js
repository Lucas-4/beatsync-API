const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");
const app = express();
const cors = require("cors");
require("dotenv").config();
const cookieParser = require("cookie-parser");

app.use(express.json());
app.use(cookieParser());
app.use(
    cors({
        origin: process.env.ALLOWED_ORIGINS.split(","),
        credentials: true,
    })
);
app.use("/profile_images", express.static("./profile_images"));
app.use("/post_images", express.static("./post_images"));

const userRoutes = require("./routes/users");
const postRoutes = require("./routes/posts");
const commentRoutes = require("./routes/comment");

app.use(userRoutes);
app.use(postRoutes);
app.use(commentRoutes);
app.get("/test", (req, res) => {
    res.send("test succesfull");
});

app.listen(process.env.PORT, ()=>{
    console.log("Listening on port: ",process.env.PORT)
});
