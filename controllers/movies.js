// Dependencies
// =======================================
// db model import
const axios = require("axios");
const db = require("../models");
let basePath = "";
let posterSizes = [];
const posterSize = 1;

module.exports = function (app) {

  app.post("/api/movie", async (req, res) => {
    const user = req.user.id;
    const title = req.body.title.replace(" ", "+");
    const movieInfo = await getMovieByTitle(title);
    if (basePath === "") {
      console.log("Setting up base path for poster images");
      const config = await getBasePath();
      basePath = config.basePath;
      posterSizes = config.posterSizes;
    }
    // Take the first movie found in the results and create our movie object
    const movie = {
      apiReferenceId: movieInfo.data.results[0].id,
      title: movieInfo.data.results[0].title,
      overview: movieInfo.data.results[0].overview,
      posterPath: basePath + posterSizes[posterSize] + movieInfo.data.results[0].poster_path
    };
    // Add the movie to our DB
    await addToMovieTable(movie, user);

    res.json(movie);
  });

};

// Calls the TMDB api with a movie title and returns the movies object
async function getMovieByTitle(title) {
  const apiKey = process.env.TMDB_API_KEY;
  const movie = await axios.get("https://api.themoviedb.org/3/search/movie?api_key=" + apiKey + "&query=" + title)
    .then((movieResponse) => {
      return movieResponse;
    })
    .catch((error) => {
      console.log(error);
    });

  return movie;
}

// Calls the TMDB api to get the base url and poster sizes for images and returns a config object
async function getBasePath() {
  const apiKey = process.env.TMDB_API_KEY;
  const configData = await axios.get("https://api.themoviedb.org/3/configuration?api_key=" + apiKey)
    .then((configData) => {
      return configData;
    })
    .catch((error) => {
      console.log(error);
    });
  const config = {
    basePath: configData.data.images.base_url,
    posterSizes: configData.data.images.poster_sizes
  };

  return config;
}

// Adds movie to DB if movie does not already exist
async function addToMovieTable(movie, user) {
  const result = await db.Movie.findOne({
    where: {
      apiReferenceId: movie.apiReferenceId
    }
  });
  if (!result) {
    db.Movie.create(movie).then((response) => {
      db.User.update(
        {
          movieOnDeckId: response.id
        },
        {
          where: {
            id: user
          }
        }
      ).then(() => {
        console.log("Movie was added to movie table");
      });
    });
  } else {
    db.User.update(
      {
        movieOnDeckId: result.id
      },
      {
        where: {
          id: user
        }
      }
    ).then((result) => {
      console.log("Updated "+ result + " rows");
    });
  }
}