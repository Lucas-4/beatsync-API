const axios = require("axios");
const querystring = require("querystring");
const User = require("../models/user.js");

module.exports = (optional) => {
    return async (req, res, next) => {
        try {
            const options = {
                url:
                    "https://api.deezer.com/user/me?" +
                    querystring.stringify({
                        access_token: req.cookies.access_token,
                    }),
            };
            const response = await axios(options);
            req.user = null;
            if (response.data.error) {
                const error = new Error("unauthorized");
                error.response = response;
                error.message = "Unauthorized";
                throw error;
            }
            if (!(await User.isSignedUp(response.data.id))) {
                const error = new Error();
                error.message = "Unauthorized";
                throw error;
            }
            req.user = response.data.id;
            next();
        } catch (error) {
            if (optional) {
                next();
            } else {
                console.log(error);
                if (error.message == "Unauthorized") {
                    return res.status(401).send({ error: error.message });
                }

                res.status(500).send({ message: "Internal server error" });
            }
        }
    };
};
