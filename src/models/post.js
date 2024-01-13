const db = require("../db/db.js");

module.exports = class Post {
    create({
        user_id,
        content,
        song_id = null,
        playlist_id = null,
        image_path = null,
    }) {
        this.user_id = user_id;
        this.content = content;
        this.song_id = song_id;
        this.playlist_id = playlist_id;
        this.image_path = image_path;

        if (song_id !== null && playlist_id !== null) {
            throw new Error(
                "posts can't have a song and a playlist attached to it at the same time"
            );
        }
    }

    async save() {
        await db.execute(
            "insert into post (user_id, content, song_id, playlist_id, image_path) values (?,?,?,?,?)",
            [
                this.user_id,
                this.content,
                this.song_id,
                this.playlist_id,
                this.image_path,
            ]
        );
    }

    static async getPost(post_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      post.post_id,
      post.user_id,
      content,
      post.create_date,
      song_id,
      playlist_id,
      username,
      display_name,
      user.image_path profile_image_path,
      post.image_path post_image_path,
      IFNULL(likes.likes_num, 0) likes_num,
      IFNULL(comment.comments_num, 0) comments_num
  FROM
      post
          INNER JOIN
      user ON user.user_id = post.user_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) likes_num
      FROM
          post_likes
      GROUP BY post_id) likes ON post.post_id = likes.post_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) comments_num
      FROM
          comment
      GROUP BY post_id) comment ON post.post_id = comment.post_id
  WHERE
      post.post_id = ?`,
            [post_id]
        );

        return rows[0];
    }

    static async getPostAuthenticated(user_id, post_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      post.post_id,
      post.user_id,
      content,
      post.create_date,
      song_id,
      playlist_id,
      username,
      display_name,
      user.image_path profile_image_path,
      post.image_path post_image_path,
      IFNULL(likes.likes_num, 0) likes_num,
      IF(ISNULL(is_liked.user_id),
          FALSE,
          TRUE) is_liked,
      IFNULL(comment.comments_num, 0) comments_num,
      post.user_id = ? belongs_to_user
  FROM
      post
          INNER JOIN
      user ON user.user_id = post.user_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) likes_num
      FROM
          post_likes
      GROUP BY post_id) likes ON post.post_id = likes.post_id
          LEFT JOIN
      (SELECT 
          user_id, post_id
      FROM
          post_likes
      WHERE
          user_id = ?) is_liked ON post.post_id = is_liked.post_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) comments_num
      FROM
          comment
      GROUP BY post_id) comment ON post.post_id = comment.post_id
  WHERE
      post.post_id = ?`,
            [user_id, user_id, post_id]
        );
        console.log(rows[0]);
        return rows[0];
    }
    static async getPosts(last_post_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      post.post_id,
      post.user_id,
      content,
      post.create_date,
      song_id,
      playlist_id,
      username,
      display_name,
      user.image_path profile_image_path,
      post.image_path post_image_path,
      IFNULL(likes.likes_num, 0) likes_num,
    IFNULL(comment.comments_num, 0) comments_num
  FROM
      post
          INNER JOIN
      user ON user.user_id = post.user_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) likes_num
      FROM
          post_likes
      GROUP BY post_id) likes ON post.post_id = likes.post_id
          LEFT JOIN
      
      (SELECT 
          post_id, COUNT(post_id) comments_num
      FROM
          comment
      GROUP BY post_id) comment ON post.post_id = comment.post_id WHERE post.post_id < ? ORDER BY post.post_id DESC LIMIT 50`,
            [last_post_id]
        );

        return rows;
    }

    static async getPostsAuthenticated(user_id, last_post_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      post.post_id,
      post.user_id,
      content,
      post.create_date,
      song_id,
      playlist_id,
      username,
      display_name,
      user.image_path profile_image_path,
      post.image_path post_image_path,
      IFNULL(likes.likes_num, 0) likes_num,
      IF(ISNULL(is_liked.user_id),
          FALSE,
          TRUE) is_liked,
    IFNULL(comment.comments_num, 0) comments_num
    

  FROM
      post
          INNER JOIN
      user ON user.user_id = post.user_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) likes_num
      FROM
          post_likes
      GROUP BY post_id) likes ON post.post_id = likes.post_id
          LEFT JOIN
      (SELECT 
          user_id, post_id
      FROM
          post_likes
      WHERE
          user_id = ?) is_liked ON post.post_id = is_liked.post_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) comments_num
      FROM
          comment
      GROUP BY post_id) comment ON post.post_id = comment.post_id  WHERE post.post_id < ?  ORDER BY post.post_id DESC LIMIT 50`,
            [user_id, last_post_id]
        );

        return rows;
    }

    static async getUserPosts(target_user_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      post.post_id,
      post.user_id,
      content,
      post.create_date,
      song_id,
      playlist_id,
      username,
      display_name,
      user.image_path profile_image_path,
      post.image_path post_image_path,
      IFNULL(likes.likes_num, 0) likes_num,
      IFNULL(comment.comments_num, 0) comments_num
  FROM
      post
          INNER JOIN
      user ON user.user_id = post.user_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) likes_num
      FROM
          post_likes
      GROUP BY post_id) likes ON post.post_id = likes.post_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) comments_num
      FROM
          comment
      GROUP BY post_id) comment ON post.post_id = comment.post_id WHERE post.user_id = ? ORDER BY post.create_date DESC`,
            [target_user_id]
        );

        return rows;
    }
    static async getUserPostsAuthenticated(loggedIn_user_id, target_user_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      post.post_id,
      post.user_id,
      content,
      post.create_date,
      song_id,
      playlist_id,
      username,
      display_name,
      user.image_path profile_image_path,
      post.image_path post_image_path,
      IFNULL(likes.likes_num, 0) likes_num,
      IF(ISNULL(is_liked.user_id),
          FALSE,
          TRUE) is_liked,
          IFNULL(comment.comments_num, 0) comments_num,
       post.user_id = ? belongs_to_user

  FROM
      post
          INNER JOIN
      user ON user.user_id = post.user_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) likes_num
      FROM
          post_likes
      GROUP BY post_id) likes ON post.post_id = likes.post_id
          LEFT JOIN
      (SELECT 
          user_id, post_id
      FROM
          post_likes
      WHERE
          user_id = ?) is_liked ON post.post_id = is_liked.post_id
          LEFT JOIN
      (SELECT 
          post_id, COUNT(post_id) comments_num
      FROM
          comment
      GROUP BY post_id) comment ON post.post_id = comment.post_id WHERE post.user_id = ?  ORDER BY post.create_date DESC`,
            [loggedIn_user_id, loggedIn_user_id, target_user_id]
        );

        return rows;
    }
    static async getLikedPosts(target_user_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
    post_likes.post_id,
    post_likes.liked_date,
    post.content,
    post.create_date,
    post.song_id,
    post.playlist_id,
    post.image_path post_image_path,
    likes.likes_num,
    IFNULL(comment.comments_num, 0) comments_num,
    user.username,
    user.display_name,
    user.image_path profile_image_path
FROM
    post_likes
        INNER JOIN
    post ON post_likes.post_id = post.post_id
        INNER JOIN
    user ON post.user_id = user.user_id
        INNER JOIN
    (SELECT 
        post_id, COUNT(post_id) likes_num
    FROM
        post_likes
    GROUP BY post_id) likes ON post_likes.post_id = likes.post_id
        LEFT JOIN
    (SELECT 
        post_id, COUNT(post_id) comments_num
    FROM
        comment
    GROUP BY post_id) comment ON post_likes.post_id = comment.post_id
WHERE
    post_likes.user_id = ?
    ORDER BY post_likes.liked_date DESC
    `,
            [target_user_id]
        );
        return rows;
    }

    static async getPostImage(postId) {
        const [rows, fields] = await db.execute(
            "SELECT image_path FROM post WHERE post_id = ?",
            [postId]
        );
        return rows[0].image_path;
    }
    static async getLikedPostsAuthenticated(target_user_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
    post_likes.post_id,
    post_likes.liked_date,
    post.content,
    post.create_date,
    post.song_id,
    post.playlist_id,
    post.image_path post_image_path,
    likes.likes_num,
    IFNULL(comment.comments_num, 0) comments_num,
    user.username,
    user.display_name,
    user.image_path profile_image_path,
    true as is_liked
FROM
    post_likes
        INNER JOIN
    post ON post_likes.post_id = post.post_id
        INNER JOIN
    user ON post.user_id = user.user_id
        INNER JOIN
    (SELECT 
        post_id, COUNT(post_id) likes_num
    FROM
        post_likes
    GROUP BY post_id) likes ON post_likes.post_id = likes.post_id
        LEFT JOIN
    (SELECT 
        post_id, COUNT(post_id) comments_num
    FROM
        comment
    GROUP BY post_id) comment ON post_likes.post_id = comment.post_id
WHERE
    post_likes.user_id = ?
    ORDER BY post_likes.liked_date DESC
    `,
            [target_user_id]
        );
        return rows;
    }
    static async getPostComments(post_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      comment.comment_id,
      comment.post_id,
      comment.user_id,
      comment.content,
      user.username,
      user.display_name,
      user.image_path profile_image_path,
      COUNT(c.parent_comment_id) comments_num,
      ifnull(likes.likes_num, 0) likes_num
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
  WHERE
      comment.post_id = ?
  GROUP BY comment.comment_id
  `,
            [post_id]
        );
        console.log(rows);
        return rows;
    }

    static async getPostCommentsAuthenticated(user_id, post_id) {
        const [rows, fields] = await db.execute(
            `SELECT 
      comment.comment_id,
      comment.post_id,
      comment.user_id,
      comment.content,
      user.username,
      user.display_name,
      user.image_path profile_image_path,
      COUNT(c.parent_comment_id) comments_num,
      ifnull(likes.likes_num, 0) likes_num,
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
      comment.post_id = ?
  GROUP BY comment.comment_id
  `,
            [user_id, post_id]
        );
        console.log(rows);
        return rows;
    }

    static async like(post_id, user_id) {
        await db.execute(
            "INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)",
            [post_id, user_id]
        );
    }

    static async unlike(post_id, user_id) {
        await db.execute(
            "DELETE FROM post_likes WHERE post_id=?  AND user_id=?",
            [post_id, user_id]
        );
    }

    static async delete(post_id, user_id) {
        const response = await db.execute(
            "DELETE FROM post WHERE post_id = ? and user_id = ?",
            [post_id, user_id]
        );
    }
};
