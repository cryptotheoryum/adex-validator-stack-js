const express = require('express')
const db = require('../db')
const { channelLoad, channelIfExists, channelIfActive } = require('../middlewares/channel')
const eventAggrService = require('../services/sentry/eventAggregator')

const router = express.Router()

const CHANNELS_FIND_MAX = 100
const VALIDATOR_MESSAGES_FIND_MAX = 10

// Channel information: public, cachable
router.get('/list', getList)
router.get('/:id/status', channelLoad, getStatus.bind(null, false))
router.get('/:id/tree', channelLoad, getStatus.bind(null, true))
router.get('/:id/validator-messages', getValidatorMessages)

// Channel information: requires auth, cachable
//router.get('/:id/events/:uid', authRequired, channelIfExists, (req, res) => res.send([]))
// @TODO get events or at least eventAggregates

// Submitting events/messages: requires auth
router.post('/:id/validator-messages', authRequired, channelLoad, postValidatorMessages)
router.post('/:id/events', authRequired, channelIfActive, postEvents)


// Implementations
function getStatus(withTree, req, res) {
	const resp = { channel: req.channel }

	Promise.resolve()
	.then(function() {
		if (withTree) {
			const channelStateTreesCol = db.getMongo().collection('channelStateTrees')
			return channelStateTreesCol.findOne({ _id: req.channel.id })
			.then(function(tree) {
				if (tree) {
					resp.balances = tree.balances
					resp.lastEvAggr = tree.lastEvAggr
				} else {
					resp.balances = {}
					resp.lastEvAggr = new Date(0)
				}
			})
		}
	})
	.then(function() {
		res.send(resp)
	})
}

function getList(req, res, next) {
	const channelsCol = db.getMongo().collection('channels')

	return channelsCol
	.find({}, { projection: { _id: 0 } })
	.limit(CHANNELS_FIND_MAX)
	.toArray()
	.then(function(channels) {
		res.send({ channels })
	})
	.catch(next)
}

function getValidatorMessages(req, res, next) {
	const validatorMsgCol = db.getMongo().collection('validatorMessages')

	return validatorMsgCol.find({ channelId: req.params.id }, { msg: 1, from: 1 })
	.limit(VALIDATOR_MESSAGES_FIND_MAX)
	.sort({ _id: -1 })
	.toArray()
	.then(function(resp) {
		res.send({ validatorMessages: resp })
	})
	.catch(next)
}

function postValidatorMessages(req, res, next) {
	if (!req.channel.validators.includes(req.session.uid)) {
		res.sendStatus(401)
		return
	}

	const validatorMsgCol = db.getMongo().collection('validatorMessages')
	const messages = req.body.messages
	const isValid = Array.isArray(messages) && messages.every(isValidatorMsgValid)
	if (!isValid) {
		res.sendStatus(400)
		return
	}

	const toInsert = messages.map(
		msg => validatorMsgCol.insertOne({
			channelId: req.channel.id,
			from: req.session.uid,
			msg,
		})
	)
	Promise.all(toInsert)
	.then(function() {
		res.send({ success: true })
	})
	.catch(next)
}

function postEvents(req, res, next) {
	if (!Array.isArray(req.body.events)) {
		res.sendStatus(400)
		return
	}
	eventAggrService.record(req.params.id, req.session.uid, req.body.events)
	.then(function() {
		res.send({ success: true })
	})
	.catch(next)
}

// Helpers
function isValidatorMsgValid(msg) {
	// @TODO either make this more sophisticated, or rewrite this in a type-safe lang
	return typeof(msg.stateRoot) === 'string' && msg.stateRoot.length == 64
		&& typeof(msg.signature) === 'string'
		&& (
			(msg.type === 'NewState' && typeof(msg.balances) === 'object')
			|| msg.type === 'ApproveState'
		)
}

function authRequired(req, res, next) {
	if (!req.session) {
		res.sendStatus(401)
		return
	}
	next()
}


// Export it
module.exports = router


