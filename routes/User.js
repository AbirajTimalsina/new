const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const USER = require('../models/users');
const AUTH = require('./Auth');
const { Timestamp } = require('mongodb');
const { update } = require('../models/users');

router.post('/signup', (req, res, next) => {
	USER.findOne({ email: req.body.email })
		.then((usersA) => {
			if (usersA != null) {
				let err = new Error(
					'This email has been already used for Registration.'
				);
				err.status = 401;
				return next(err);
			} else {
				bcrypt.hash(req.body.password, 10, function (err, hash) {
					if (err) {
						throw new Error('Could not encrypt Password!');
					}
					let USERA = new USER(req.body);
					USERA.password = hash;
					USERA.save().then((usersB) => {
						let token = jwt.sign({ userID: usersB._id }, process.env.SECRET);
						res.json({ status: 'Signup Success!', token: token });
					});
				});
			}
		})
		.catch(next);
	console.log('Signup Post');
});

router.post('/login', (req, res, next) => {
	USER.findOne({ phonenumber: req.body.phonenumber })
		.then((usersA) => {
			if (usersA === null) {
				let err = new Error('Phone Number not found!');
				err.status = 401;
				res.json({ status: 'Phone Number not found!', Date: Date.now() });
				return next(err);
			}
			bcrypt.compare(req.body.password, usersA.password, function (
				err,
				status
			) {
				if (!status) {
					let err = new Error('Password does not match!');
					err.status = 401;
					res.json({ status: 'Password does not match!', Date: Date.now() });
					return next(err);
				}
				console.log('Login post');
				let token = jwt.sign({ userID: usersA._id }, process.env.SECRET);
				res.json({ status: 'Successfully logged in', token: token });
			});
		})
		.catch(next);
});

router.post('/userforgotpassword', (req, res, next) => {
	USER.findOne({ email: req.body.email })
		.then((usersA) => {
			res.json(usersA);
		})
		.catch(next);
	console.log('I was here');
});

router.put('/userforgotpassword', (req, res, next) => {
	bcrypt.hash(req.body.password, 10, function (err, hash) {
		if (err) {
			throw new Error('Could not encrypt Password!');
		}
		USER.findOneAndUpdate(
			{ email: req.body.email },
			{ $set: { password: hash } },
			{ new: true }
		)
			.then((UserB) => {
				res.json({
					UserB,
				});
			})
			.catch(next);
		console.log('Profile Put');
	});
});

router.put('/purchaseupdate', AUTH.verifyUser, (req, res, next) => {
	USER.findById(req.user._id)
		.then((userA) => {
			req.body.map((element) => {
				userA.purchase.push({
					itemname: element.nameValuePairs.itemname,
					itemprice: element.nameValuePairs.itemprice,
				});
			});
			userA.save().then((userB) => {
				res.json(userB);
				console.log({ status: 'Purchase Successful', Date: Date.now() });
			});
		})
		.catch(next);
});

updatefeedback = (req, element, res) => {
	if (!element.rating) {
		USER.findOneAndUpdate(
			{
				_id: req.user._id,
				feedback: {
					$elemMatch: { itemname: element.itemname },
				},
			},
			{
				$set: {
					'feedback.$.favorite': element.favorite,
				},
			}
		).then((data) => {
			// let userfeedback = data.feedback.id(data.feedback[0]._id);
			console.log(
				'Updated favorite for ' + req.user._id + ' on ' + element.itemname
			);
		});
	} else if (!element.favorite) {
		USER.findOneAndUpdate(
			{
				_id: req.user._id,
				feedback: {
					$elemMatch: { itemname: element.itemname },
				},
			},
			{
				$set: {
					'feedback.$.rating': element.rating,
				},
			}
		).then((data) => {
			// let userfeedback = data.feedback.id(data.feedback[0]._id);
			console.log(
				'Updated rating for ' + req.user._id + ' on ' + element.itemname
			);
		});
	}
};

createfeedback = (req, element, res) => {
	USER.findById(req.user._id).then((data) => {
		data.feedback.push(element);
		data.save().then((created) => {
			console.log('Created for ' + req.user._id + ' on ' + element.itemname);
		});
	});
};

router.post('/feedback', AUTH.verifyUser, (req, res, next) => {
	try {
		req.body.map((element) => {
			USER.findOne({
				_id: req.user._id,
				feedback: {
					$elemMatch: { itemname: element.itemname },
				},
			}).then((data) => {
				if (!data) {
					createfeedback(req, element, res);
				} else {
					updatefeedback(req, element, res);
				}
			});
		});
		res.json({ status: 'feedback noted successfully', Array: req.body });
	} catch (e) {
		console.log(e);
		res.json(e);
	}
});

router.get('/me', AUTH.verifyUser, (req, res, next) => {
	res.json(req.user).catch(next);
});

router.get('/profile/:phonenumber', (req, res, next) => {
	USER.findOne({ phonenumber: req.params.phonenumber })
		.then((userA) => {
			res.json(userA);
		})
		.catch(next);
});
module.exports = router;
