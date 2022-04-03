const nodejs = (typeof process === 'object' && process.title === 'node') ? true : false;
const { Worker: NodeWorker } = require('worker_threads');
const pad = require('pad');
const { wallet, block: nWebBlock, tools: nWebTools } = require('nanocurrency-web');
const { nPowTest, nPowHash, nPowToByteArray } = require('./xno-data-tools-pow-common');

exports.nPowTest = nPowTest;
exports.nPowHash = nPowHash;
exports.nPowToByteArray = nPowToByteArray;
exports.nTools = function(config) {
	if (typeof config == 'undefined')
		throw "Configuration object is required";
	this.config = config;
        this.nRpc = config['nRpc'];
        if (typeof this.nRpc == undefined) {
                let NanoRpcClient = require('xno-rpc-client');
                this.nRpc = new NanoRpcClient.nRpc();
        }
	/**
	 * Shorten an account address
	 * @param   {String}	account		- Account address.
	 * @returns {String}			- Shortened display version of account.
	 */
	this.shortAccount = function(account) {
		return `...${account.substr(-12)}`;
	};
	/**
	 * Shorten a block hash
	 * @param   {String}	hash		- Block hash.
	 * @returns {String}			- Shortened display versino of block hash.
	 */
	this.shortHash = function(hash) {
		return `...${hash.substr(-12)}`;
	};
        /**
         * Find 8 byte proof of work nonce for a block hash.
         * @param   {String}    hash            - Hexadecimal block hash.
         * @param   {String}    threshold       - 8 byte hexadecimal threshold that nonce must exceed.
         * @param   {Object}    c               - Force pass by reference.
         * @param   {Boolean}   c.cancel        - Cancel the promise (force a reject and end the workers).
         * @param   {function}  callback        - Progress callback for every 1,000,000 hash attempts.
         * @param   {Number}    limit           - (Optional) Invoke callback every 'limit' of attempts.
         * @returns {Object}    o               - Result object.
         *                      o.nonce         - 8 byte hexadecimal nonce.
         *                      o.difficulty    - 8 byte hexadecimal difficulty, resulting hash, that was produced.
         *                      o.threshold     - 8 byte hexadecimal threshold that difficulty exceeded.
         */
        this.pow = async function(hash, threshold, c, callback, limit) {
		let promise = new Promise((resolve, reject) => {
			if (nodejs) {
				const worker = new NodeWorker(`${__dirname}/xno-data-tools-pow.js`);
				worker.on('message', (message) => {
					if (message.type == 'status')
						callback(message);
					if (message.type == 'result')
						resolve(message.data);
				});
				worker.postMessage({
					hash: hash,
					threshold: threshold
				});
			} else {
                        	let workers = [];
                        	let maxWorkers = navigator.hardwareConcurrency || 4;
                        	for (let x = 0; x < maxWorkers; x++) {
                        	        const worker = new Worker(`/scripts/xno-data-tools-pow.js`);
                	                worker.onmessage = (event) => {
        	                                if (event.data.type == 'status') {
	                                                callback(event.data);
                                                	if (c.cancel == true) {
                                        	                for (let y = 0; y < workers.length; y++)
                                	                                workers[y].terminate();
                        	                                reject({ status: 'canceled' });
                	                                }
        	                                }
	                                        if (event.data.type == 'result') {
                                        	        resolve(event.data);
                                	                for (let y = 0; y < workers.length; y++)
                        	                                workers[y].terminate();
                	                        }
        	                        };
	                                worker.postMessage({
                                        	hash: hash,
                                	        threshold: threshold,
                        	                limit: limit
                	                });
        	                        workers.push(worker);
	                        }
			}
		});
		return promise;
	};
	/*
	 * Build a receive block ready to be sent for processing.
	 * @param {Object} block	- Pending send block.
	 * @param {String} privateKey	- Private key of account to receive send block.
	 * @returns {Object}		- Signed receive block with proof of work ready for processing.
	 */
	this.buildReceiveBlock = async function(block, privateKey) {
        	let promise = new Promise(async (resolve, reject) => {
                	let publicKey = nWebTools.addressToPublicKey(block.contents.link_as_account);
                	let senderAccount = await this.nRpc.getAccountInfoAsync(block.block_account);
                	let receiverAccount = await this.nRpc.getAccountInfoAsync(block.contents.link_as_account);
                	let genesis = (typeof receiverAccount['error'] != 'undefined' && receiverAccount.error == 'Account not found') ? true : false;
                	let nonced = await this.pow((genesis == true) ? publicKey : receiverAccount.frontier, 'fffffe0000000000', (async () => {
				let noncePromise = new Promise((resolve, reject) => {
	                        	process.stdout.write('.');
					resolve();
				});
				return noncePromise;
                	}));
                	const newBlock = {
                        	walletBalanceRaw: (genesis == true) ? '0' : receiverAccount.balance,
                        	toAddress: block.contents.link_as_account,
                        	representativeAddress: block.contents.representative,
                        	frontier: (genesis == true) ? '0000000000000000000000000000000000000000000000000000000000000000' : receiverAccount.frontier,
                        	transactionHash: block.block_hash,
                        	amountRaw: block.amount,
                        	work: nonced.nonce
                	};
                	let signedNewBlock = nWebBlock.receive(newBlock, privateKey);
                	resolve(signedNewBlock);
	        });
        	return promise;
	};
	/**
	 * Get NANO formated version of raw amount
	 * @param   {String}	raw		- Amount of transaction in raw form.
	 * @returns {String}			- Amount of transaction in NANO decimal form.
	 */
	this.getNANO = function(raw) {
        	if (typeof raw == 'undefined')
                	return "0.0";
        	if (raw.toString().length > 31) {
                	raw = `${raw.toString().substring(0, raw.toString().length - 31)}.${raw.toString().substring(raw.toString().length - 30)}`;
	        } else if (raw.toString().length < 32) {
        	        raw = "0." + pad(30, raw.toString(), '0');
	        }
        	return raw;
	};
	this.validateAddress = function(address) {
		return nWebTools.validateAddress(address);
	};
};
