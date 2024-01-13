const db = require("../db/db.js");

module.exports = class User {
    create({ user_id, username, display_name, bio, image_path }) {
        this.user_id = user_id;
        this.username = username;
        this.display_name = display_name;
        this.bio = bio;
        this.image_path = image_path;
    }

    async save() {
        await db.execute(
            "INSERT INTO user (user_id, username, display_name, bio, image_path) VALUES (?,?,?,?,?)",
            [
                this.user_id,
                this.username,
                this.display_name,
                this.bio,
                this.image_path,
            ]
        );
    }

    async update(update_image) {
        if (update_image) {
            await db.execute(
                "UPDATE user SET display_name = ?, bio = ?, image_path = ? where user_id = ?",
                [this.display_name, this.bio, this.image_path, this.user_id]
            );
        } else {
            await db.execute(
                "UPDATE user SET display_name = ?, bio = ? where user_id = ?",
                [this.display_name, this.bio, this.user_id]
            );
        }
    }
    static async getUser(user_id) {
        const [rows, fields] = await db.execute(
            "select user_id, username, display_name, bio, image_path from user where user_id = ?",
            [user_id]
        );
        return rows[0];
    }

    //returns the user_id of the username
    static async getUserId(username) {
        const [rows, fields] = await db.execute(
            "select user_id, image_path from user where username = ?",
            [username]
        );
        return rows[0];
    }

    static async getImage(userId) {
        const [rows, fields] = await db.execute(
            "SELECT image_path FROM user WHERE user_id = ?",
            [userId]
        );
        return rows[0].image_path;
    }
    static async isUsernameAvailable(username) {
        const [rows, fields] = await db.execute(
            "select * from user where username = ?",
            [username]
        );
        return rows[0] === undefined;
    }

    static async getByUsername(username) {
        const [rows, fields] = await db.execute(
            `SELECT 
      user_id,
      username,
      display_name,
      bio,
      image_path,
      IFNULL(followers_num, 0) followers_num,
      IFNULL(following_num, 0) following_num
  FROM
      user
          LEFT JOIN
      (SELECT 
          following_id, COUNT(following_id) followers_num
      FROM
          user_follows
      WHERE
          following_id = (SELECT 
                  user_id
              FROM
                  user
              WHERE
                  username = ?)
      GROUP BY following_id) AS followers ON user_id = followers.following_id
          LEFT JOIN
      (SELECT 
          follower_id, COUNT(follower_id) following_num
      FROM
          user_follows
      WHERE
          follower_id = (SELECT 
                  user_id
              FROM
                  user
              WHERE
                  username = ?)
      GROUP BY follower_id) AS following ON user_id = following.follower_id
  WHERE
      username = ?`,
            [username, username, username]
        );
        return rows[0];
    }

    static async getByUsernameAuthenticated(requesting_user_id, username) {
        const [rows, fields] = await db.execute(
            `SELECT 
      user_id,
      username,
      display_name,
      bio,
      image_path,
      IF(ISNULL(b.follower_id), 0, 1) is_being_followed,
      IFNULL(followers_num, 0) followers_num,
      IFNULL(following_num, 0) following_num
  FROM
      user
          LEFT JOIN
      (SELECT 
          *
      FROM
          user_follows
      WHERE
          follower_id = ?
              AND following_id = (SELECT 
                  user_id
              FROM
                  user
              WHERE
                  username = ?)) b ON user_id = b.following_id
                  LEFT JOIN
                  (SELECT 
                      following_id, COUNT(following_id) followers_num
                  FROM
                      user_follows
                  WHERE
                      following_id = (SELECT 
                              user_id
                          FROM
                              user
                          WHERE
                              username = ?)
                  GROUP BY following_id) AS followers ON user_id = followers.following_id
                      LEFT JOIN
                  (SELECT 
                      follower_id, COUNT(follower_id) following_num
                  FROM
                      user_follows
                  WHERE
                      follower_id = (SELECT 
                              user_id
                          FROM
                              user
                          WHERE
                              username = ?)
                  GROUP BY follower_id) AS following ON user_id = following.follower_id
  WHERE
      username = ?`,
            [requesting_user_id, username, username, username, username]
        );
        return rows[0];
    }
    static async isSignedUp(id) {
        const result = await db.execute(
            "select * from user where user_id = ?",
            [id]
        );
        const user = result[0][0];
        if (user === undefined) {
            return false;
        } else {
            return true;
        }
    }

    static async follow(follower_id, following_id) {
        await db.execute(
            "INSERT INTO user_follows (follower_id, following_id) VALUES(?,?)",
            [follower_id, following_id]
        );
    }

    static async unfollow(follower_id, following_id) {
        await db.execute(
            "DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?",
            [follower_id, following_id]
        );
    }
    static async delete(user_id) {
        await db.execute("DELETE FROM user WHERE user_id = ?", [user_id]);
    }

    static async getFollowers(username) {
        const [rows, fields] = await db.execute(
            `SELECT user_id, username, display_name, image_path profile_image_path
             FROM user_follows INNER JOIN user on user_follows.follower_id=user.user_id WHERE following_id=
        (SELECT user_id FROM user WHERE username=?)`,
            [username]
        );

        return rows;
    }

    static async getFollowing(username) {
        const [rows, fields] = await db.execute(
            `SELECT user_id, username, display_name, image_path profile_image_path
             FROM user_follows INNER JOIN user on user_follows.following_id=user.user_id WHERE follower_id=
        (SELECT user_id FROM user WHERE username=?)`,
            [username]
        );

        return rows;
    }
};
