const assert = require('assert')
const BN = require('bn.js')
const { persist } = require('./propagation')
function getStateRootHash(channel, balances, adapter){
	// Note: MerkleTree takes care of deduplicating and sorting
	const elems = Object.keys(balances).map(
		acc => adapter.getBalanceLeaf(acc, balances[acc])
	)
	const tree = new adapter.MerkleTree(elems)
	const balanceRoot = tree.getRoot()
	// keccak256(channelId, balanceRoot)
	const stateRoot = adapter.getSignableStateRoot(Buffer.from(channel.id), balanceRoot).toString('hex')
	return stateRoot
}

function isValidRootHash(leaderRootHash, { channel, balancesAfterFees, adapter }) {
	return getStateRootHash(channel, balancesAfterFees, adapter) === leaderRootHash
}

function toBNMap(raw) {
	assert.ok(raw && typeof(raw) === 'object', 'raw map is a valid object')
	const balances = {}
	Object.entries(raw).forEach(([acc, bal]) => balances[acc] = new BN(bal, 10))
	return balances
}

<<<<<<< HEAD
// returns BN
function getValidatorFee(publisherBalance, totalValidatorFee, depositAmount) {
	const numerator = depositAmount.sub(totalValidatorFee)
	const fee = (publisherBalance.mul(numerator)).div(depositAmount)
	return fee
}

function getBalancesAfterFeesTree(balances, channel) {
	const { depositAmount } = channel
	const leaderFee = new BN(channel.spec.validators[0].fee)
	const followerFee = new BN(channel.spec.validators[1].fee)

	const totalValidatorFee = leaderFee.add(followerFee)

	let currentValidatorFee = new BN(0, 10)
	
	let balancesAfterFees = {}

	Object.keys(balances).forEach((publisher) => {
		let publisherBalance = new BN(balances[publisher], 10);
		const validatorFee = getValidatorFee(publisherBalance, totalValidatorFee, new BN(depositAmount, 10))
		publisherBalance = publisherBalance.sub(validatorFee)
		assert.ok(!publisherBalance.isNeg(), 'publisher balance should not be negative')

		currentValidatorFee = currentValidatorFee.add(validatorFee)
		balancesAfterFees[publisher] = publisherBalance
	})

	return { ...balancesAfterFees, validator: currentValidatorFee }
}

function toBNStringMap(raw){
	assert.ok(raw && typeof(raw) === 'object', 'raw map is a valid object')
	const balances = {}
	Object.entries(raw).forEach(([acc, bal]) => balances[acc] = bal.toString(10))
	return balances
}

module.exports = { getStateRootHash, isValidRootHash, toBNMap, getBalancesAfterFeesTree, toBNStringMap }
=======
function toStringBN(raw) {
	let result = ``
	Object.entries(raw).forEach(([acc, bal]) => result = `${result} ${acc}: ${bal.toString()}`)
	return result
}

function invalidNewState(channel, adapter, { reason, newMsg}) {
	// quirk: type is overiding type in newMsg
	return persist(adapter, channel, {
		...newMsg,
		type: 'InvalidNewState',
		reason,
	})
}

function onError(channel, adapter, { reason, newMsg, prevBalancesString, newBalancesString }) {
	const errMsg = getErrorMsg(reason, channel, prevBalancesString, newBalancesString)

	return invalidNewState(channel, adapter, { reason, newMsg})
	.then(function(){
		console.error(errMsg)
		return { nothingNew: true }
	})
}

function getErrorMsg(type, channel, prevBalancesString, newBalancesString ){
	return `validatatorWorker: ${channel.id}: ${type} requested in NewState 
			 prevBalances: ${prevBalancesString}, \n newBalances: ${newBalancesString}`
}

module.exports = { getStateRootHash, isValidRootHash, toBNMap, invalidNewState, onError, toStringBN, getErrorMsg }
>>>>>>> ed5fe23... added invalidNewState, refactor tests
