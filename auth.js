/**
 * Secret key used for signing JWTs
 */
const jwtSecret = 'your_jwt_secret';

/**
 * Required dependencies
 */
const jwt = require('jsonwebtoken');
const passport = require('passport');

/**
 * Function to generate a JWT for a given user
 * @param {Object} user - The user object for which the JWT is to be generated
 * @returns {String} - The generated JWT
 */
let generateJWTToken = (user) => {
  return jwt.sign(user, jwtSecret, {
    subject: user.Username, // Username of the user
    expiresIn: '7d', // Token validity duration
    algorithm: 'HS256' // Algorithm used for signing the token
  });
};

/**
 * POST login
 * 
 * This module exports a function that defines the login route. When a POST request is made to /login,
 * Passport's local strategy is used to authenticate the user. If authentication is successful, a JWT is generated
 * and returned to the client along with the user information.
 * 
 * @param {Object} router - The router object used to define routes
 */
module.exports = (router) => {
  router.post('/login', (req, res) => {
    passport.authenticate('local', { session: false }, (error, user, info) => {
      console.log(user); // Log the user object
      console.log(error); // Log any errors
      if (error || !user) { // Check for errors or if user is not found
        return res.status(400).json({
          message: 'Something is not right',
          user: user
        });
      }
      req.login(user, { session: false }, (error) => { // Log the user in without creating a session
        if (error) { // Handle login errors
          res.send(error);
        }
        let token = generateJWTToken(user.toJSON()); // Generate JWT for the user
        return res.json({ user, token }); // Return user and token in response
      });
    })(req, res);
  });
}

