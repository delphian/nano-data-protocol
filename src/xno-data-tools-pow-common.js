const blake = require('blakejs');
const crypto = require('crypto');

function bnToBuf(bn) {
  var hex = BigInt(bn).toString(16);
  if (hex.length % 2) { hex = '0' + hex; }

  var len = hex.length / 2;
  var u8 = new Uint8Array(len);

  var i = 0;
  var j = 0;
  while (i < len) {
    u8[i] = parseInt(hex.slice(j, j+2), 16);
    i += 1;
    j += 2;
  }

  return u8;
}

function bufToBn(buf) {
  var hex = [];
  u8 = Uint8Array.from(buf);

  u8.forEach(function (i) {
    var h = i.toString(16);
    if (h.length % 2) { h = '0' + h; }
    hex.push(h);
  });

  return BigInt('0x' + hex.join(''));
}

let toHexString = function(byteArray) {
  return Array.from(byteArray, function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('')
};

let toByteArray = function(hexString) {
	var result = new Uint8Array(hexString.length / 2);
	for (var i = 0; i < hexString.length; i += 2) {
		result[i / 2] = parseInt(hexString.substr(i, 2), 16);
	}
	return result;
};
/**
 * @param   {Buffer}     nonce           - 8 byte buffer Nonce to test.
 * @param   {String}     blockHash       - 32 byte hexadecimal block hash. Do not prepend '0x' marker.
 * @returns {String}                     - 8 byte hexadecimal (16 characters) Blake2b hash.
 */
let powHash = function(nonce, blockHash) {
	let h = blake.blake2bInit(8, null);
	blake.blake2bUpdate(h, nonce.reverse());
	blake.blake2bUpdate(h, toByteArray(blockHash));
	let result = blake.blake2bFinal(h);
	return toHexString(result.reverse());
};
/**
 * @param   {Buffer}    nonce           - 8 byte buffer nonce to test.
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
let powWorker = async function(hash, threshold, callback, limit) {
	if (typeof limit == 'undefined')
		limit = 1000000;
       	let promise = new Promise(async (resolve, reject) => {
                let x = 0;
               	let nonce = null;
       	        let difficulty = null;
                do {
                       	nonce = crypto.randomBytes(8);
               	        difficulty = powTest(nonce, hash, threshold);
       	                if (x++ > limit) {
                                if (typeof callback == 'function')
                               	        await callback({
						nonce: toHexString(nonce),
						difficulty: difficulty,
						threshold: threshold
					});
                       	        x = 0;
               	        }
       	        } while(difficulty == null)
                resolve({
                       	nonce: toHexString(nonce),
                       	difficulty: difficulty,
                       	threshold: threshold
               	});
       	});
       	return promise;
};


exports.xnoToByteArray = toByteArray;
exports.xnoPowHash = powHash;
exports.xnoPowTest = powTest;
exports.xnoPowWorker = powWorker;
