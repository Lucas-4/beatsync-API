const express = require("express");
const router = express.Router();
const querystring = require("querystring");
const auth = require("../middleware/auth.js");
const Post = require("../models/post.js");
const Comment = require("../models/comment.js");
const axios = require("axios");
const multer = require("multer");

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "post_images");
  },
  filename: async (req, file, cb) => {
    let fileName = file.originalname;
    if (file.originalname.length > 100) {
      fileName = file.originalname.split(0, 101);
    }
    cb(null, Date.now().toString() + fileName);
  },
});

const upload = multer({ storage: fileStorage });

router.post("/posts", auth(), upload.single("upload"), async (req, res) => {
  try {
    const post = new Post();
    post.create({
      user_id: req.user,
      content: req.body.content,
      song_id: req.body.song_id === "null" ? null : req.body.song_id,
      playlist_id:
        req.body.playlist_id === "null" ? null : req.body.playlist_id,
      image_path:
        req.file === undefined
          ? null
          : req.file.filename === undefined
          ? null
          : req.file.filename,
    });

    await post.save();
    res.status(200).send({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "server error" });
  }
});

router.get("/posts", auth(), async (req, res) => {
  try {
    const posts = await Post.getPosts(req.user);
    // console.log(posts);
    // const song_ids = new Array();
    // const playlist_ids = new Array();
    // posts.forEach((post) => {
    //   if (post.song_id !== null) {
    //     song_ids.push(post.song_id);
    //   }
    //   if (post.playlist_id !== null) {
    //     playlist_ids.push(post.playlist_id);
    //   }
    // });

    // const response = await axios({
    //   url:
    //     "https://api.spotify.com/v1/tracks?" +
    //     querystring.stringify({ ids: song_ids.toString() }),
    //   headers: { Authorization: "Bearer " + req.cookies.access_token },
    // });
    // const songs_data = response.data.tracks;
    // // console.log(response.data.tracks);
    // const map = new Map();
    // songs_data.forEach((song_data) => {
    //   map.set();
    // });
    // posts.map((post) => {
    //   if (post.song_id !== null) {
    //   }
    //   return { ...post };
    // });
    res.status(200).send({ posts: posts });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "internal server error" });
  }
});

router.get("/posts/:id", auth(), async (req, res) => {
  try {
    const post = await Post.getPost(req.user, req.params.id);
    res.status(200).send({ post: post });
  } catch (error) {
    console.log(error);
    res.status(500).send({ error: "internal server error" });
  }
});

router.post("/posts/:id/like", auth(), async (req, res) => {
  try {
    await Post.like(req.params.id, req.user);
    res.status(201).send({ message: "post liked succesfully" });
  } catch (error) {
    console.log(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).send({ message: "User already liked this post" });
    }
    res.status(500).send({ message: "internal server error" });
  }
});

router.post("/posts/:id/comments", auth(), async (req, res) => {
  try {
    const comment = new Comment();
    comment.create({
      post_id: req.params.id,
      user_id: req.user,
      content: req.body.content,
    });
    console.log(comment);
    await comment.save();
    res.status(201).send({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "error" });
  }
});

router.get("/posts/:id/comments", auth(), async (req, res) => {
  try {
    const comments = await Post.getPostComments(req.user, req.params.id);
    res.status(201).send({ comments: comments });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "error" });
  }
});

router.delete("/posts/:id", auth(), async (req, res) => {
  try {
    await Post.deletePost(req.params.post_id, req.user);
    res.status(200).send({ message: "success" });
  } catch (error) {
    console.log(error);
  }
});

router.delete("/posts/:id/like", auth(), async (req, res) => {
  try {
    await Post.unlike(req.params.id, req.user);
    res.status(201).send({ message: "post unliked succesfully" });
  } catch (error) {
    console.log(error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).send({ message: "User already liked this post" });
    }
    res.status(500).send({ message: "internal server error" });
  }
});

module.exports = router;
