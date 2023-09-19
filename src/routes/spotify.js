const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth.js");
const querystring = require("querystring");
const axios = require("axios");

router.get("/search_song/:q", auth(), async (req, res) => {
  try {
    const options = {
      url:
        "https://api.spotify.com/v1/search?" +
        querystring.stringify({ q: req.params.q, type: "track", limit: 50 }),
      headers: { Authorization: "Bearer " + req.cookies.access_token },
    };

    const response = await axios(options);
    const songs = response.data.tracks.items.map((song) => {
      return {
        artists: song.artists.map((artist) => {
          return { id: artist.id, name: artist.name };
        }),
        href: song.external_urls.spotify,
        id: song.id,
        name: song.name,
        image: song.album.images[0],
      };
    });
    res.status(200).send({ songs: songs });
  } catch (error) {
    console.log(error);
  }
});

router.get("/search_playlist/:q", auth(), async (req, res) => {
  try {
    const options = {
      url:
        "https://api.spotify.com/v1/search?" +
        querystring.stringify({ q: req.params.q, type: "playlist", limit: 50 }),
      headers: { Authorization: "Bearer " + req.cookies.access_token },
    };

    const response = await axios(options);
    console.log(response.data.playlists.items);
    const playlists = response.data.playlists.items.map((playlist) => {
      return {
        description: playlist.description,
        id: playlist.id,
        image: playlist.images[0],
        name: playlist.name,
        href: playlist.external_urls.spotify,
      };
    });
    res.status(200).send({ playlists: playlists });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
