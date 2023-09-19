const axios = require("axios");
module.exports = (optional) => {
  return async (req, res, next) => {
    try {
      const options = {
        url: "https://api.spotify.com/v1/me",
        headers: { Authorization: "Bearer " + req.cookies.access_token },
      };
      const response = await axios(options);
      req.user = response.data.id;
      next();
    } catch (error) {
      if (optional) {
        next();
      } else {
        console.log(error.response.data);
        if (error.response) {
          return res
            .status(401)
            .send({ error: error.response.data.error.message });
        }

        res.status(500).send({ message: "Imternal server error" });
      }
    }
  };
};
