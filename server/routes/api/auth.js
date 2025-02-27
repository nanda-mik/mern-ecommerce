const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Bring in Models & Helpers
const User = require('../../models/user');
const mailchimp = require('../../services/mailchimp');
const mailgun = require('../../services/mailgun');

const key = process.env.SECRET_OR_KEY;

router.post('/login', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email) {
    return res.status(400).json({ error: 'You must enter an email address.' });
  }

  if (!password) {
    return res.status(400).json({ error: 'You must enter a password.' });
  }

  User.findOne({ email }).then(user => {
    if (!user) {
      res.status(400).send({ error: 'No user found for this email address.' });
    }
    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        const payload = { id: user.id };
        jwt.sign(payload, key, { expiresIn: 3600 }, (err, token) => {
          res.status(200).json({
            success: true,
            token: `Bearer ${token}`,
            user: {
              id: user.id,
              profile: {
                firstName: user.profile.firstName,
                lastName: user.profile.lastName,
                is_subscribed: user.profile.is_subscribed
              },
              email: user.email,
              role: user.role
            }
          });
        });
      } else {
        res.status(400).json({
          success: false,
          error: 'Password Incorrect'
        });
      }
    });
  });
});

router.post('/register', (req, res) => {
  const email = req.body.email;
  const firstName = req.body.firstName;
  const lastName = req.body.lastName;
  const password = req.body.password;
  const isSubscribed = req.body.isSubscribed;

  if (!email) {
    return res.status(400).json({ error: 'You must enter an email address.' });
  }

  if (!firstName || !lastName) {
    return res.status(400).json({ error: 'You must enter your full name.' });
  }

  if (!password) {
    return res.status(400).json({ error: 'You must enter a password.' });
  }

  User.findOne({ email }, async (err, existingUser) => {
    if (err) {
      next(err);
    }

    if (existingUser) {
      res.status(400).json({ error: 'That email address is already in use.' });
    }

    let subscriberId = '';
    if (isSubscribed) {
      const result = await mailchimp.subscribeToNewsletter(email);

      if (result.status === 'subscribed') {
        subscriberId = result.id;
      }
    }

    const user = new User({
      email,
      password,
      profile: { firstName, lastName, isSubscribed, subscriberId }
    });

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(user.password, salt, (err, hash) => {
        if (err) {
          res.status(400).json({
            error: 'Your request could not be processed. Please try again.'
          });
        }

        user.password = hash;

        user.save(async (err, user) => {
          if (err) {
            res.status(400).json({
              error: 'Your request could not be processed. Please try again.'
            });
          }

          const payload = { id: user.id };

          await mailgun.sendEmail(user.email, 'signup', null, user.profile);

          jwt.sign(payload, key, { expiresIn: 3600 }, (err, token) => {
            res.status(200).json({
              success: true,
              token: `Bearer ${token}`,
              user: {
                id: user.id,
                profile: {
                  firstName: user.profile.firstName,
                  lastName: user.profile.lastName,
                  isSubscribed: user.profile.isSubscribed
                },
                email: user.email,
                role: user.role
              }
            });
          });
        });
      });
    });
  });
});

router.post('/forgot', (req, res) => {
  const email = req.body.email;

  if (!email) {
    return res.status(400).json({ error: 'You must enter an email address.' });
  }

  User.findOne({ email }, (err, existingUser) => {
    if (err || existingUser == null) {
      res.status(400).json({
        error:
          'Your request could not be processed as entered. Please try again.'
      });
    }

    crypto.randomBytes(48, (err, buffer) => {
      const resetToken = buffer.toString('hex');
      if (err) {
        res.status(400).json({
          error: 'Your request could not be processed. Please try again.'
        });
      }

      existingUser.resetPasswordToken = resetToken;
      existingUser.resetPasswordExpires = Date.now() + 3600000;

      existingUser.save(async err => {
        if (err) {
          res.status(400).json({
            error: 'Your request could not be processed. Please try again.'
          });
        }

        await mailgun.sendEmail(existingUser.email, 'reset', req, resetToken);

        res.status(200).json({
          success: true,
          message:
            'Please check your email for the link to reset your password.'
        });
      });
    });
  });
});

router.post('/reset/:token', (req, res) => {
  const password = req.body.password;

  if (!password) {
    res.status(400).json({ error: 'You must enter a password.' });
  }

  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() }
    },
    (err, resetUser) => {
      if (!resetUser) {
        res.status(400).json({
          error:
            'Your token has expired. Please attempt to reset your password again.'
        });
      }
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(req.body.password, salt, (err, hash) => {
          if (err) {
            return res.status(400).json({
              error:
                'Your request could not be processed as entered. Please try again.'
            });
          }
          req.body.password = hash;

          resetUser.password = req.body.password;
          resetUser.resetPasswordToken = undefined;
          resetUser.resetPasswordExpires = undefined;

          resetUser.save(async err => {
            if (err) {
              res.status(400).json({
                error:
                  'Your request could not be processed as entered. Please try again.'
              });
            }

            await mailgun.sendEmail(resetUser.email, 'reset-confirmation');

            res.status(200).json({
              success: true,
              message:
                'Password changed successfully. Please login with your new password.'
            });
          });
        });
      });
    }
  );
});

router.post('/reset', (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!password) {
    res.status(400).json({ error: 'You must enter a password.' });
  }

  User.findOne({ email }, (err, existingUser) => {
    if (err || existingUser == null) {
      res.status(400).json({
        error:
          'Your request could not be processed as entered. Please try again.'
      });
    }

    bcrypt.genSalt(10, (err, salt) => {
      bcrypt.hash(req.body.password, salt, (err, hash) => {
        if (err) {
          res.status(400).json({
            error:
              'Your request could not be processed as entered. Please try again.'
          });
        }
        req.body.password = hash;

        existingUser.password = req.body.password;

        existingUser.save(async err => {
          if (err) {
            res.status(400).json({
              error:
                'Your request could not be processed as entered. Please try again.'
            });
          }

          await mailgun.sendEmail(existingUser.email, 'reset-confirmation');

          res.status(200).json({
            success: true,
            message:
              'Password changed successfully. Please login with your new password.'
          });
        });
      });
    });
  });
});

module.exports = router;
