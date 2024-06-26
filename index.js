/**
 * Required dependencies
 */
const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const app = express();
const uuid = require('uuid');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Models = require('./models.js');

/**
 * Models from the models.js file
 */
const Movies = Models.Movie;
const Users = Models.User;

/**
 * Express validator for request validation
 */
const { check, validationResult } = require('express-validator');

/**
 * Connect to MongoDB database
 */
mongoose.connect(process.env.CONNECTION_URI, { useNewUrlParser: true, useUnifiedTopology: true });
// mongoose.connect('mongodb+srv://username:password@cluster-url/myflixparttwo', { useNewUrlParser: true, useUnifiedTopology: true });

/**
 * Basic route to check if the app is loaded
 */
app.get('/', async (req, res) => {
  res.send("APP loaded :)");
});

/**
 * Middleware to parse incoming request bodies
 */
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/**
 * Cross-Origin Resource Sharing (CORS) configuration
 */
const cors = require('cors');
let allowedOrigins = ['http://localhost:8080', 'http://localhost:1234', 'https://seaflix.netlify.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      let message = 'The CORS policy for this application doesn’t allow access from origin ' + origin;
      return callback(new Error(message), false);
    }
    return callback(null, true);
  }
}));

/**
 * Passport authentication middleware
 */
let auth = require('./auth')(app);
const passport = require('passport');
require('./passport');

/**
 * Serve static files from the 'public' directory
 */
app.use(express.static('public'));

/**
 * Morgan for logging HTTP requests
 */
app.use(morgan('common'));

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

/**
 * POST a new user
 */
app.post('/users', [
  // Validation logic for creating a new user
  check('Username', 'Username is required').isLength({ min: 5, max: 10 }),
  check('Username', 'Username contains non-alphanumeric characters - not allowed').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Email', 'Email does not appear to be valid').isEmail()
], async (req, res) => {
  let errors = validationResult(req);
  console.log("request", req);

  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }

  let hashedPassword = Users.hashPassword(req.body.Password);
  try {
    const existingUser = await Users.findOne({ Username: req.body.Username });
    if (existingUser) {
      return res.status(400).send(req.body.Username + ' already exists');
    } else {
      const newUser = await Users.create({
        Username: req.body.Username,
        Password: hashedPassword,
        Email: req.body.Email,
        Birthday: req.body.Birthday
      });
      return res.status(201).json(newUser);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: ' + error);
  }
});

/**
 * GET all users
 */
app.get('/users', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const users = await Users.find();
    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: ' + error);
  }
});

/**
 * GET a user by username
 */
app.get('/users/:username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  try {
    const user = await Users.findOne({ Username: req.params.username });
    if (!user) {
      res.status(404).send('User not found');
    } else {
      res.status(200).json(user);
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: ' + error);
  }
});

/**
 * PUT (update) a user by username
 */
app.put('/users/:username', passport.authenticate('jwt', { session: false }), [
  // Validation logic for updating user info
  check('Username', 'Username is required').isLength({ min: 5, max: 10 }),
  check('Username', 'Username contains non-alphanumeric characters - not allowed').isAlphanumeric(),
  check('Password', 'Password is required').not().isEmpty(),
  check('Email', 'Email does not appear to be valid').isEmail()
], async (req, res) => {
  if (req.user.Username !== req.params.username) {
    return res.status(403).send('Permission denied');
  }
  try {
    const updatedUser = await Users.findOneAndUpdate({ Username: req.params.username }, {
      $set: {
        Username: req.body.Username,
        Password: req.body.Password,
        Email: req.body.Email,
        Birthday: req.body.Birthday
      }
    }, { new: true });
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error(error);
    res.status(500).send('Error: ' + error);
  }
});

/**
 * GET all movies
 */
app.get('/movies', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.find()
    .then((movies) => {
      res.status(201).json(movies);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).send("Error: " + error);
    });
});

/**
 * GET a movie by title
 */
app.get('/movies/:title', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ Title: req.params.Title })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * GET a movie by genre
 */
app.get('/movies/:Genre/:Description', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ Genre: req.params.Title })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * GET a movie by director
 */
app.get('/movies/:Director', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Movies.findOne({ Director: req.params.Title })
    .then((movie) => {
      res.json(movie);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * Add a movie to a user's list of favorites
 */
app.post('/users/:Username/movies/:MovieId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.findOneAndUpdate({ Username: req.params.Username }, {
    $push: { FavoriteMovies: req.params.MovieId }
  }, { new: true })
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * DELETE a movie from a user's list of favorites
 */
app.delete('/users/:Username/movies/:MovieId', passport.authenticate('jwt', { session: false }), async (req, res) => {
  await Users.findOneAndRemove({ Username: req.params.Username }, {
    $pull: { FavoriteMovies: req.params.MovieId }
  }, { new: true })
    .then((updatedUser) => {
      res.json(updatedUser);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('Error: ' + err);
    });
});

/**
 * Delete a user by username
 */
app.delete('/users/:Username', passport.authenticate('jwt', { session: false }), async (req, res) => {
  if (req.user.Username !== req.params.Username) {
    return res.status(403).send('Permission denied');
  }

  Users.findOneAndRemove({ Username: req.params.Username })
    .then((user) => {
      if (!user) {
        return res.status(404).send(req.params.Username + ' was not found');
      }
      res.status(200).send(req.params.Username + ' was deleted');
    })
    .catch((err) => res.status(500).send('Error: ' + err));
});

/**
 * Start the server
 */
const port = process.env.PORT || 8080;
app.listen(port, '0.0.0.0', () => {
  console.log('Listening on Port ' + port);
});
