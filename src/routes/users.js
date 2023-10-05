const express = require("express");
const request = require("request");
const querystring = require("querystring");
const axios = require("axios");
const User = require("../models/user.js");
const multer = require("multer");
const client_id = process.env.SPOTIFY_CLIENT_ID;
const client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const auth = require("../middleware/auth.js");
const path = require("path");
const Post = require("../models/post.js");
let redirect_uri = "";

/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */
const generateRandomString = function (length) {
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

const stateKey = "spotify_auth_state";

const router = express.Router();

router.get("/users/spotify_authorize", function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state, { secure: true, sameSite: "none" });
  redirect_uri = req.headers.origin + "/get_token";
  const scope = "user-read-private user-read-email";
  res.send({
    redirect:
      "https://accounts.spotify.com/authorize?" +
      querystring.stringify({
        response_type: "code",
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
      }),
  });
});

//request must be called after redirect from /user/login
//request url must have 'state' and 'code' parameters
router.get("/users/get_token", async (req, res) => {
  try {
    const code = req.query.code || null;
    const state = req.query.state || null;
    const storedState = req.cookies ? req.cookies[stateKey] : null;
    const redirect = req.headers.origin;

    if (state === null || state !== storedState) {
      return res.status(400).send({ error: "state_mismatch" });
    }
    const authOptions = {
      url: "https://accounts.spotify.com/api/token",
      method: "post",
      data: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: "authorization_code",
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization:
          "Basic " +
          Buffer.from(client_id + ":" + client_secret).toString("base64"),
      },
    };

    const { data } = await axios(authOptions);

    const access_token = data.access_token;
    const refresh_token = data.refresh_token;

    const options = {
      url: "https://api.spotify.com/v1/me",
      headers: { Authorization: "Bearer " + access_token },
    };

    const response = await axios(options);

    const userExists = await User.isSignedUp(response.data.id);

    res.cookie("access_token", access_token, {
      secure: true,
      sameSite: "none",
    });

    res.cookie("refresh_token", refresh_token, {
      secure: true,
      sameSite: "none",
    });

    res.send({ redirect: redirect, userExists: userExists });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "internal server error" });
  }
});

router.get("/users/get_refresh_token", function (req, res) {
  // requesting access token from refresh token
  const refresh_token = req.query.refresh_token;
  const authOptions = {
    url: "https://accounts.spotify.com/api/token",
    headers: {
      Authorization:
        "Basic " + Buffer(client_id + ":" + client_secret).toString("base64"),
    },
    form: {
      grant_type: "refresh_token",
      refresh_token: refresh_token,
    },
    json: true,
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      const access_token = body.access_token;
      res.send({
        access_token: access_token,
      });
    }
  });
});

async function getUserId(req) {
  const options = {
    url: "https://api.spotify.com/v1/me",
    headers: { Authorization: "Bearer " + req.cookies.access_token },
  };
  const response = await axios(options);
  return response.data.id;
}

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "profile_images");
  },
  filename: async (req, file, cb) => {
    cb(null, (await getUserId(req)) + path.extname(file.originalname));
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
  async (req, res, next) => {
    try {
      req.user = await getUserId(req);
      if (await User.isSignedUp(req.user)) {
        return res.status(400).send({ message: "User already signed up" });
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
      res.status(200).send({ message: "User created" });
    } catch (error) {
      console.log(error);
      if (error.userValidation) {
        return res.status(401).send({ userValidation: error.userValidation });
      }
      if (error.response) {
        console.log(error.response.data);
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
    await getUserId(req);
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
      return res.status(400).send({ userValidation: error.userValidation });
    }
    res.status(500).send({ message: "internal server error" });
  }
});

router.get("/users/:username/posts", auth(), async (req, res) => {
  try {
    const { user_id } = await User.getUserId(req.params.username);
    const posts = await Post.getUserPosts(req.user, user_id);
    res.status(200).send({ posts: posts });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "internal server error" });
  }
});

router.get("/users/:username/liked_posts", auth(), async (req, res) => {
  try {
    const { user_id } = await User.getUserId(req.params.username);
    const posts = await Post.getLikedPosts(user_id);
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

router.get("/users/:username", auth(), async (req, res) => {
  try {
    const user = await User.getByUsername(req.user, req.params.username);
    console.log(req.user);
    user.is_my_profile = req.user === user.user_id;
    console.log(user);
    res.status(200).send({ user: user });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "internal server error" });
  }
});

router.post("/users/me/following", auth(), async (req, res) => {
  try {
    console.log(req.user);
    console.log(req.body.following_id);
    await User.follow(req.user, req.body.following_id);
    res.status(201).send({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "internal server error" });
  }
});

router.delete("/users/me/following", auth(), async (req, res) => {
  try {
    console.log(req.user);
    console.log(req.body.following_id);
    await User.unfollow(req.user, req.body.following_id);
    res.status(201).send({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "internal server error" });
  }
});

router.post("/users/logout", (req, res) => {
  res.clearCookie("access_token", {
    sameSite: "none",
    secure: true,
  });
  res.clearCookie("refresh_token", {
    sameSite: "none",
    secure: true,
  });
  res.send();
});

router.delete("/user/user_id", async (req, res) => {});

module.exports = router;
