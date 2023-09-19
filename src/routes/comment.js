const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.js");
const Comment = require("../models/comment.js");

router.post("/comments/:parent_comment_id", auth(), async (req, res) => {
  try {
    const comment = new Comment();
    comment.create({
      parent_comment_id: req.params.parent_comment_id,
      user_id: req.user,
      content: req.body.content,
    });

    await comment.save();
    res.status(201).send({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "internal server error" });
  }
});

router.get("/comments/:parent_comment_id", auth(), async (req, res) => {
  try {
    const replies = await Comment.getReplies(
      req.user,
      req.params.parent_comment_id
    );
    res.status(200).send({ replies: replies });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "internal server error" });
  }
});

router.post("/comments/:comment_id/like", auth(), async (req, res) => {
  try {
    await Comment.like(req.params.comment_id, req.user);
    res.status(200).send({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "internal server error" });
  }
});

router.delete("/comments/:comment_id/like", auth(), async (req, res) => {
  try {
    await Comment.unlike(req.params.comment_id, req.user);
    res.status(200).send({ message: "success" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ message: "internal server error" });
  }
});
module.exports = router;
