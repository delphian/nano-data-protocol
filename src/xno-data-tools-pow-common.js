const blake = require('blakejs');
const crypto = require('crypto');

let toByteArray = function(hexString, endianness) {
	var result = new Uint8Array(hexString.length / 2);
	if (endianness == 'big') {
		for (var i = 0; i < hexString.length; i += 2) {
			result[i / 2] = parseInt(hexString.substr(i, 2), 16);
		}
	} else {
		for (var i = hexString.length; i >= 0; i -= 2) {
			result[hexString.length - (i / 2)] = parseInt(hexString.substr(i, 2), 16);
		}
	}
	return result;
};
/**
 * @param   {String}    nonce           - 8 byte hexedecimal nonce to test. Do not prepend '0x' marker.
 * @param   {String}    blockHash       - 32 byte hexadecimal block hash. Do not prepend '0x' marker.
 * @returns {String}                    - 8 byte hexadecimal hash.
 */
let powHash = function(nonce, blockHash) {
       	let hash = null;
	let h = blake.blake2bInit(8, null);
	blake.blake2bUpdate(h, toByteArray(nonce, 'big'));
	blake.blake2bUpdate(h, toByteArray(blockHash, 'big'));
	let result = blake.blake2bFinal(h);
	let resultHash = "";
	for (let x = result.length - 1; x >= 0; x--) {
		let hex = Number(result[x]).toString(16);
		if (hex.length == 1)
			hex = `0${hex}`;
		resultHash += hex;
	}
	return resultHash;
};
/**
 * @param   {String}    nonce           - 8 byte hexedecimal nonce to test. Do not prepend '0x' marker.
 * @param   {String}    blockHash       - 32 byte hexadecimal block hash. Do not prepend '0x' marker.
 * @param   {String}    threshold       - 8 byte hexadecimal threshold blake2 digest must exceed. Do not prepend '0x' marker.
 * @returns {String}                    - 8 byte hexadecimal hash if nonce exceeds threshold, null otherwise.
 */
let powTest = function(nonce, blockHash, threshold) {
       	let difficulty = null;
       	let hash = powHash(nonce, blockHash);
       	if (BigInt(`0x${hash}`) >= BigInt(`0x${threshold}`))
               	difficulty = hash;
       	return difficulty;
};
/**
 * Find 8 byte proof of work nonce for a block hash.
 * @param   {String}	hash		- Hexadecimal block hash.
 * @param   {String}	threshold	- 8 byte hexadecimal threshold that nonce must exceed.
 * @param   {function}	callback	- Progress callback for every 1,000,000 hash attempts.
 * @param   {Number}	limit		- (Optional) Invoke callback every 'limit' of attempts.
 * @returns {Object}	o		- Result object.
 *			o.nonce		- 8 byte hexadecimal nonce.
 *			o.difficulty	- 8 byte hexadecimal difficulty, resulting hash, that was produced.
 *			o.threshold	- 8 byte hexadecimal threshold that difficulty exceeded.
 */
let pow = async function(hash, threshold, callback, limit) {
	if (typeof limit == 'undefined')
		limit = 1000000;
       	let promise = new Promise(async (resolve, reject) => {
                let x = 0;
               	let nonce = null;
       	        let difficulty = null;
                do {
                       	nonce = crypto.randomBytes(8);
               	        difficulty = powTest(nonce.toString('hex'), hash, threshold);
       	                if (x++ > limit) {
                                if (typeof callback == 'function')
                               	        await callback({
						nonce: nonce.reverse().toString('hex'),
						difficulty: difficulty,
						threshold: threshold
					});
                       	        x = 0;
               	        }
       	        } while(difficulty == null)
                resolve({
                       	nonce: nonce.reverse().toString('hex'),
                       	difficulty: difficulty,
                       	threshold: threshold
               	});
       	});
       	return promise;
};

exports.nPowToByteArray = toByteArray;
exports.nPowHash = powHash;
exports.nPowTest = powTest;
exports.nPow = pow;
