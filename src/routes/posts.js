const express = require("express");
const router = express.Router();
const querystring = require("querystring");
const auth = require("../middleware/auth.js");
const Post = require("../models/post.js");
const Comment = require("../models/comment.js");
const axios = require("axios");
const multer = require("multer");
const fs = require("fs/promises");

const fileStorage = multer.diskStorage({
    destination: "post_images",
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
        res.status(201).send({ message: "success" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "server error" });
    }
});

router.get("/posts", auth(true), async (req, res) => {
    try {
        let posts,
            response = {},
            lastPostId;
        if (
            req.query.lastPostId === "undefined" ||
            req.query.lastPostId === undefined
        ) {
            lastPostId = 2147483647;
        } else {
            lastPostId = req.query.lastPostId;
        }

        if (req.user) {
            posts = await Post.getPostsAuthenticated(req.user, lastPostId);
            posts.map((post) => {
                post.belongs_to_current_user =
                    post.user_id === req.user ? true : false;
            });
        } else {
            posts = await Post.getPosts(lastPostId);
        }
        response.lastPostId = posts[posts.length - 1].post_id;
        response.posts = posts;
        res.status(200).send(response);
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "internal server error" });
    }
});

router.get("/posts/:id", auth(true), async (req, res) => {
    try {
        let post;
        if (req.user) {
            post = await Post.getPostAuthenticated(req.user, req.params.id);
            post.belongs_to_current_user =
                post.user_id === req.user ? true : false;
        } else {
            post = await Post.getPost(req.params.id);
        }

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
            return res
                .status(400)
                .send({ message: "User already liked this post" });
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
        await comment.save();
        res.status(201).send({ message: "success" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "error" });
    }
});

router.get("/posts/:id/comments", auth(true), async (req, res) => {
    try {
        let comments;
        if (req.user) {
            comments = await Post.getPostCommentsAuthenticated(
                req.user,
                req.params.id
            );
        } else {
            comments = await Post.getPostComments(req.params.id);
        }
        res.status(201).send({ comments: comments });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "error" });
    }
});

router.delete("/posts/:id", auth(), async (req, res) => {
    try {
        const post = await Post.getPost(req.params.id);
        const postOwner = post.user_id;
        if (req.user !== postOwner) {
            const error = new Error();
            error.code = 403;
            error.message = "User doesn't own this post";
            throw error;
        }
        if (post.post_image_path !== null) {
            await fs.unlink("post_images/" + post.post_image_path);
        }

        await Post.delete(req.params.id, req.user);
        res.status(200).send({ message: "success" });
    } catch (error) {
        console.log(error);
        if (error.code === 403) {
            res.status(403).send({ error: error });
        }
        res.status(500).send({ error: "Internal server error" });
    }
});

router.delete("/posts/:id/like", auth(), async (req, res) => {
    try {
        await Post.unlike(req.params.id, req.user);
        res.status(201).send({ message: "post unliked succesfully" });
    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "internal server error" });
    }
});

module.exports = router;
