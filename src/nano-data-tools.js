const pad = require('pad');
const { wallet, block: nWebBlock, tools: nWebTools } = require('nanocurrency-web');
const { Worker } = require('worker_threads');

exports.nTools = function(config) {
	if (typeof config == 'undefined')
		throw "Configuration object is required";
	this.config = config;
        this.nRpc = config['nRpc'];
        if (typeof this.nRpc == undefined) {
                let NanoRpcClient = require('nano-rpc-client');
                this.nRpc = new NanoRpcClient.nRpc();
        }
	/**
	 * Find 8 byte proof of work nonce for a block hash.
	 * @param   {String}    hash            - Hexadecimal block hash.
	 * @param   {String}    threshold       - 8 byte hexadecimal threshold that nonce must exceed.
	 * @param   {function}  callback        - Progress callback for every 1,000,000 hash attempts.
 	 * @returns {Object}    o               - Result object.
	 *                      o.nonce         - 8 byte hexadecimal nonce.
	 *                      o.difficulty    - 8 byte hexadecimal difficulty, resulting hash, that was produced.
	 *                      o.threshold     - 8 byte hexadecimal threshold that difficulty exceeded.
	 */
	this.pow = async function(hash, threshold, callback) {
		let promise = new Promise((resolve, reject) => {
			const worker = new Worker(`${__dirname}/nano-data-tools-pow.js`);
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
};
