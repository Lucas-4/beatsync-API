const db = require("../db/db");

module.exports = class Comment {
    create({ post_id = null, parent_comment_id = null, user_id, content }) {
        if (post_id === null && parent_comment_id === null) {
            throw new Error("parent and post can't both be null");
        }
        this.post_id = post_id;
        this.parent_comment_id = parent_comment_id;
        this.user_id = user_id;
        this.content = content;
    }

    async save() {
        await db.execute(
            "INSERT INTO comment (post_id, parent_comment_id, user_id, content) VALUES (?,?,?,?)",
            [this.post_id, this.parent_comment_id, this.user_id, this.content]
        );
    }

    static async getReplies(user_id, parent_comment_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      comment.comment_id,
      comment.user_id,
      comment.content,
      user.username,
      user.display_name,
      user.image_path profile_image_path,
      COUNT(c.parent_comment_id) comments_num,
      IFNULL(likes.likes_num, 0) likes_num,
      IF(ISNULL(user_likes.comment_id), 0, 1) is_liked
  FROM
      comment
          INNER JOIN
      user ON comment.user_id = user.user_id
          LEFT JOIN
      comment c ON comment.comment_id = c.parent_comment_id
          LEFT JOIN
      (SELECT 
          comment_id, COUNT(comment_id) likes_num
      FROM
          comment_likes
      GROUP BY comment_id) likes ON comment.comment_id = likes.comment_id
                LEFT JOIN
        (SELECT 
            *
        FROM
            comment_likes
        WHERE
            user_id = ?) user_likes ON comment.comment_id = user_likes.comment_id
  WHERE
      comment.parent_comment_id = ?
  GROUP BY comment.comment_id`,
            [user_id, parent_comment_id]
        );

        return rows;
    }

    static async like(comment_id, user_id) {
        await db.execute(
            "insert into comment_likes (comment_id, user_id) values(?,?)",
            [comment_id, user_id]
        );
    }

    static async unlike(comment_id, user_id) {
        await db.execute(
            "delete from comment_likes where comment_id = ? AND user_id = ?",
            [comment_id, user_id]
        );
    }
};
