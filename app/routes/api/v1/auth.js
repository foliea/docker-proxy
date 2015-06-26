'use strict';

let express = require('express'),
  passport = require('passport'),
  errors = require('../../shared/errors'),
  User = require('../../../models').User;

let router = express.Router();

const CREATE_FILTER = { fields:
  ['email', 'password', 'password_hash', 'token', 'token_id']
};

router
.post('/login', (req, res, next) => {
  let created = false;

  User.findOne({ where: { email: req.body.email } })
  .then(user => {
    created = user === null;
    return user || User.create(req.body, CREATE_FILTER);
  })
  .then(user => {
    if (!created && !user.verifyPassword(req.body.password)) {
      throw new errors.UnauthorizedError();
    }
    let statusCode = created ? 201 : 200;

    res.status(statusCode).json({ token: user.token });
  })
  .catch(next);
})

.get('/github', passport.authenticate('github'))
.get('/github/callback', passport.authenticate('github', { session: false }),
  (req, res) => {
    console.log(req.headers);
    res.status(204).send();
});

module.exports = router;
