const express = require("express");
const request = require("request");
const querystring = require("querystring");
const axios = require("axios");
const User = require("../models/user.js");
const multer = require("multer");
const auth = require("../middleware/auth.js");
const path = require("path");
const Post = require("../models/post.js");
const fs = require("fs/promises");
const DEEZER_APP_ID = process.env.DEEZER_APP_ID;
const DEEZER_APP_SECRET = process.env.DEEZER_APP_SECRET;
let redirect_uri = "";

const router = express.Router();

router.get("/users/deezer_authorization", async (req, res) => {
    try {
        redirect_uri = req.headers.origin + "/get_token";
        res.send({
            redirect:
                "https://connect.deezer.com/oauth/auth.php?" +
                querystring.stringify({
                    app_id: DEEZER_APP_ID,
                    redirect_uri: redirect_uri,
                    perms: "basic_access,email",
                }),
        });
    } catch (error) {
        console.log(error);
    }
});

const getUserId = async (access_token) => {
    const response = await axios({
        url:
            "https://api.deezer.com/user/me?" +
            querystring.stringify({ access_token: access_token }),
    });

    if (response.data.error) {
        throw new Error();
    }
    return response.data.id;
};

router.get("/users/get_token", async (req, res) => {
    try {
        const code = req.query.code;
        const axiosRes = await axios({
            url:
                "https://connect.deezer.com/oauth/access_token.php?" +
                querystring.stringify({
                    app_id: DEEZER_APP_ID,
                    secret: DEEZER_APP_SECRET,
                    code: code,
                }),
            method: "get",
        });
        const { access_token } = querystring.parse(axiosRes.data);
        res.cookie("access_token", access_token, {
            secure: true,
            sameSite: "none",
            maxAge: 3600000,
        });

        //gets the user id using the acces token
        const user_id = await getUserId(access_token);

        //sends a redirect url to the main page if the user is signed up, or sends a redirect url to the signup page otherwise
        let redirect = req.headers.origin;
        if (!(await User.isSignedUp(user_id))) {
            redirect = req.headers.origin + "/signup";
        }
        res.status(200).send({ redirect: redirect });
    } catch (error) {
        console.log(error);
        res.status(400).send(error);
    }
});

const fileStorage = multer.diskStorage({
    destination: "profile_images",
    filename: async (req, file, cb) => {
        cb(null, req.user + path.extname(file.originalname));
    },
});

const upload = multer({ storage: fileStorage });

async function validateUser(user, validateUsername = true) {
    let isUsernameAvailable;
    if (validateUsername) {
        isUsernameAvailable = await User.isUsernameAvailable(user.username);
    }
    const userValidation = {
        isValid: true,
        username: { isValid: true, message: "" },
        display_name: { isValid: true, message: "" },
        bio: { isValid: true, message: "" },
    };

    if (validateUsername) {
        if (!isUsernameAvailable) {
            userValidation.isValid = false;
            userValidation.username.isValid = false;
            userValidation.username.message = "Username not available";
        }
        if (user.username.trim().length === 0) {
            userValidation.isValid = false;
            userValidation.username.isValid = false;
            userValidation.username.message = "Username can't be empty";
        }
    }
    if (user.display_name.trim().length === 0) {
        userValidation.isValid = false;
        userValidation.display_name.isValid = false;
        userValidation.display_name.message = "Display name can't be empty";
    }
    if (user.bio.trim().length === 0) {
        userValidation.isValid = false;
        userValidation.bio.isValid = false;
        userValidation.bio.message = "Bio  can't be empty";
    }
    if (!userValidation.isValid) {
        const error = new Error();
        error.userValidation = userValidation;
        throw error;
    }
}

router.post(
    "/users",
    //check if user is already signed up
    async (req, res, next) => {
        try {
            req.user = await getUserId(req.cookies.access_token);
            if (await User.isSignedUp(req.user)) {
                return res
                    .status(400)
                    .send({ message: "User already signed up" });
            } else {
                next();
            }
        } catch (error) {
            console.log(error);
            res.status(500).send({ message: "internal server error" });
        }
    },
    upload.single("upload"),
    async (req, res) => {
        try {
            req.body.image_path =
                req.file !== undefined
                    ? req.file.filename
                    : "default-profile-image.jpg";
            const user = new User();
            user.create({
                user_id: req.user,
                username: req.body.username,
                display_name: req.body.display_name,
                bio: req.body.bio,
                image_path: req.body.image_path,
            });
            await validateUser(user);
            await user.save();
            res.status(201).send({ message: "User created" });
        } catch (error) {
            console.log(error);
            if (error.userValidation) {
                return res
                    .status(401)
                    .send({ userValidation: error.userValidation });
            }
            if (error.response) {
                return res
                    .status(error.response.data.error.status)
                    .send({ error: error.response.data.error.message });
            }
            if (error.code === "ER_DUP_ENTRY") {
                return res.status(409).send({ error: "User already exists" });
            }
            res.status(500).send({ error: "internal server error" });
        }
    }
);

router.put("/users", auth(), upload.single("upload"), async (req, res) => {
    try {
        req.body.image_path = req.file !== undefined ? req.file.filename : "";
        const user = new User();
        // await getUserId(req.user);
        user.create({
            user_id: req.user,
            display_name: req.body.display_name,
            bio: req.body.bio,
            image_path: req.body.image_path,
        });
        await validateUser(user, false);
        await user.update(!(req.file === undefined));
        res.status(201).send({ message: "success" });
    } catch (error) {
        console.log(error);
        if (error.userValidation) {
            return res
                .status(400)
                .send({ userValidation: error.userValidation });
        }
        res.status(500).send({ message: "internal server error" });
    }
});

router.get("/users/:username/posts", auth(true), async (req, res) => {
    try {
        const { user_id } = await User.getUserId(req.params.username);
        let posts;
        if (req.user) {
            posts = await Post.getUserPostsAuthenticated(req.user, user_id);
            posts.map((post) => {
                post.belongs_to_current_user =
                    post.user_id === req.user ? true : false;
            });
        } else {
            posts = await Post.getUserPosts(user_id);
        }
        res.status(200).send({ posts: posts });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "internal server error" });
    }
});

router.get("/users/:username/liked_posts", auth(true), async (req, res) => {
    try {
        const { user_id } = await User.getUserId(req.params.username);
        let posts;
        if (req.user) {
            posts = await Post.getLikedPostsAuthenticated(user_id);
        } else {
            posts = await Post.getLikedPosts(user_id);
        }
        res.status(200).send({ posts: posts });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "internal server error" });
    }
});

router.get("/users/me", auth(), async (req, res) => {
    try {
        const user = await User.getUser(req.user);

        res.status(200).send({ user: user });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "internal server error" });
    }
});

router.get("/users/:username", auth(true), async (req, res) => {
    try {
        let user;
        if (req.user) {
            user = await User.getByUsernameAuthenticated(
                req.user,
                req.params.username
            );
            user.is_my_profile = req.user === user.user_id;
        } else {
            user = await User.getByUsername(req.params.username);
            user.is_my_profile = false;
        }

        console.log(user);
        res.status(200).send({ user: user });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "internal server error" });
    }
});

router.get("/users/:username/followers", async (req, res) => {
    try {
        const followers = await User.getFollowers(req.params.username);
        res.status(200).send({ followers: followers });
    } catch (error) {
        console.log(error);
    }
});

router.get("/users/:username/following", async (req, res) => {
    try {
        const users = await User.getFollowing(req.params.username);
        res.status(200).send({ users: users });
    } catch (error) {
        console.log(error);
    }
});

router.post("/users/me/following", auth(), async (req, res) => {
    try {
        await User.follow(req.user, req.body.following_id);
        res.status(201).send({ message: "success" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "internal server error" });
    }
});

router.delete("/users/me/following", auth(), async (req, res) => {
    try {
        await User.unfollow(req.user, req.body.following_id);
        res.status(201).send({ message: "success" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "internal server error" });
    }
});

router.post("/users/logout", (req, res) => {
    try {
        res.clearCookie("access_token", {
            sameSite: "none",
            secure: true,
        });

        res.status(200).send();
    } catch (error) {
        console.log(error);
    }
});

router.delete("/users/me", auth(), async (req, res) => {
    try {
        const userImage = await User.getImage(req.user);
        if (userImage !== "default-profile-image.jpg") {
            await fs.unlink("profile_images/" + userImage);
        }
        await User.delete(req.user);
        res.status(201).send({ message: "User Deleted" });
    } catch (error) {
        console.log(error);
    }
});

module.exports = router;
