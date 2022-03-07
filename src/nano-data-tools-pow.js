const { parentPort } = require('worker_threads');
const blake2 = require('blake2');
const crypto = require('crypto');

let toByteArray = function(hexString) {
	var result = [];
	for (var i = 0; i < hexString.length; i += 2) {
		result.push(parseInt(hexString.substr(i, 2), 16));
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
       	let h = blake2.createHash('blake2b', { digestLength: 8 });
       	let i = Buffer.alloc(8);
       	i.writeBigUInt64LE(BigInt(`0x${nonce}`), 0);
       	h.update(i);
     	h.update(Buffer.from(toByteArray(blockHash)));
       	return h.digest().readBigUInt64LE().toString(16);
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
 * @returns {Object}	o		- Result object.
 *			o.nonce		- 8 byte hexadecimal nonce.
 *			o.difficulty	- 8 byte hexadecimal difficulty, resulting hash, that was produced.
 *			o.threshold	- 8 byte hexadecimal threshold that difficulty exceeded.
 */
let pow = async function(hash, threshold, callback) {
       	let promise = new Promise(async (resolve, reject) => {
                let x = 0;
               	let nonce = null;
       	        let difficulty = null;
                do {
                       	nonce = crypto.randomBytes(8);
               	        difficulty = powTest(nonce.toString('hex'), hash, threshold);
       	                if (x++ > 1000000) {
                                if (typeof callback == 'function')
                               	        await callback();
                       	        x = 0;
               	        }
       	        } while(difficulty == null)
                resolve({
                       	nonce: nonce.toString('hex'),
                       	difficulty: difficulty,
                       	threshold: threshold
               	});
       	});
       	return promise;
};


parentPort.once('message', async (message) => {
	let nonced = await pow(message.hash, message.threshold, () => {
		parentPort.postMessage({ type: 'status', data: null });
	});
	parentPort.postMessage({ type: 'result', data: nonced });
});
