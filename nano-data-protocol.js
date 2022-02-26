const pad = require('pad');

exports.nData = function(config) {
	if (typeof config == 'undefined')
		throw "Configuration object is required";
	if (typeof config['node'] == 'undefined' && typeof config['nRpc'] == 'undefined')
		throw "'node' configuration property is required";
	if (typeof config['polling'] == 'undefined' && typeof config['nSub'] == 'undefined')
		throw "'polling' configuration property is required";
	this.qrcode = (typeof config['qrcode'] != 'undefined') ? config.qrcode : require('qrcode');
	this.axios = (typeof config['axios'] != 'undefined') ? config.axios : require('axios');
	this.nRpc = config['nRpc'];
	if (typeof this.nRpc == 'undefined') {
		const nanoRpcClient = require('nano-rpc-client');
                this.nRpc = new nanoRpcClient.nRpc({
                        node: config.node['node'],
                        axios: this.axios,
                        axiosLimit: (typeof config['axiosLimit'] != 'undefined') ? config.axiosLimit : 5000
                });
	}
	this.nSub = config['nSub'];
	if (typeof this.nSub == 'undefined') {
		const nanoRpcSubscribe = require('nano-rpc-subscribe');
		this.nSub = new nanoRpcSubscribe.nSub({
		        nRpc: this.nRpc,
		        polling: config.polling
		});
	}
	this.baseDataChars =
		String.fromCharCode(9)  +  // Tab
		String.fromCharCode(10) +  // Line feed
		String.fromCharCode(13) +  // Carriage return
		String.fromCharCode(27) +  // Escape
		" !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~";
		//                20               37
/*
		String.fromCharCode(8);    // Backspace
		String.fromCharCode(127);  // Delete
*/
	/**
	 * Get NANO from raw amount
	 * @param   {String} raw	Raw transaction amount.
	 * @returns {String}		Amount formated as NANO.
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
	this.encodeQRCode = function(account, data, filename, options) {
	        this.qrcode.toFile(
        	        filename,
                	`nano:${account}?amount=${data}`,
	                {
        	                color: {
                	                dark: '#666666',  // dots
                        	        light: '#00000000' // background
	                        }
        	        });
	};
	/**
	 * Decode two character amount 00-99 to nano base data character
	 * @param	{String} segment	Two character amount 00-99
	 * @return	{String}		Single nano address character
	 */
	this.decodeSegment = function(segment) {
		let number = parseInt(segment);
		if (isNaN(number) || number >= this.baseDataChars.length)
			throw `Segment '${segment}(${number})' is not encoded`;
		return this.baseDataChars.charAt(number);
	}
	/**
	 * Encode single character to 2 character amout 00-99
	 * @param	{String} character	Single character to encode
	 * @return	{String}		Two character string of encoded character
	 */
	this.encodeSegment = function(character) {
		let nanoData = this.baseDataChars.indexOf(character);
		if (nanoData < 0)
			throw `Can't encode '${character}', no valid index found`;
		nanoData = (nanoData < 10) ? `0${nanoData.toString()}` : nanoData.toString();
		return nanoData;
	};
	/**
	 * Decode string of amount segments to base data characters
	 * @param	{String} amount		Complete amount
	 * @param	{Number} segOffset	Number of segments, from the right, base 1, to begin decoding
	 * @param	{Number} segLimit	Number of segments from segOffset to include in decoding
	 * @example
	 * // returns 'A'
	 * DecodeSegments("003700", 2, 1);
	 * @returns	{String}		Decoded amount from numbers to base data characters
	 */
	this.decodeSegments = function(amount, segOffset, segLimit) {
		let charOffset = amount.toString().length - (segOffset * 2);
		let charLimit = segLimit * 2;
		if (charOffset < 0 || charOffset > amount.toString().length)
			throw "segOffset out of bounds.";
		if (charOffset + charLimit > amount.toString().length)
			throw "segLimit out of bounds.";
		let segments = amount.toString().substr(charOffset, charLimit);
		let decoded = "";
		for (let x = 0; x < segments.length; x = x + 2) {
			decoded += this.decodeSegment(segments.substr(x, 2));
		}
		return decoded
	};
	/**
	 * Encode string as nano amount
	 * @param	{String} characters	String to encode as nano amount
	 * @returns	{String} 		Data encoded as nano amount
	 */
	this.encodeSegments = function(characters) {
		let encoded = "";
		for (let x = 0; x < characters.length; x++) {
			encoded += this.encodeSegment(characters[x]);
		}
		return encoded;
	};
        /**
         * Decode string of all amount segments to base data characters
         * @param       {String} amount         Complete amount
         * @example
         * // returns '0A0'
         * DecodeSegmentsAll("003700");
         * @returns     {String}                Decoded amount from numbers to base data characters
         */
	this.decodeSegmentsAll = function(amount) {
		if (amount % 2 !== 0)
			throw "Bytes not aligned to segments";
		return this.decodeSegments(amount, (amount.toString().length / 2), amount.toString().length / 2);
	};
	this.decodeMeta = function(amount) {
		let type = amount.substr(-14, 2);
		let data = amount.substr(0, amount.length - 14);
		if (type == "00") {
			data = this.decodeSegmentsAll(data);
		}
		return data;
	};
	/**
	 * Encode single part raw data
	 * @param	{String} account	Destination account address.
	 * @param	{String} data		Data to encode.
	 * @returns	{String}		Raw nano amount.
	 */
	this.encodeMeta00 = function(account, data) {
		let amount = `${this.encodeSegments(data)}00${this.encodeSegments(account.substr(-6))}`;
		return amount;
	};
	/**
	 * Determine if the amount specified indicates a meta packet
	 * @param	{String} amount		Complete amount
	 * @param	{String} account	Account number of receiver
	 * @returns	{bool}			True if the transfer indicates meta packet, false otherwise
	 */
	this.isMeta = function(account, amount) {
		let meta = false;
		if (typeof amount != 'undefined' && amount.toString().length >= 12) {
			let accountLast6 = account.substr(-6);
			let amountLast6 = this.decodeSegments(amount.toString(), 6, 6);
			if (amountLast6 == accountLast6)
				meta = true;
		}
		return meta;
	};
	this.listen = function(account, callback) {
	        this.nSub.subscribe(account, async (subject, message) => {
			let isMeta = false;
			if (message.type == 'receivable') {
				isMeta = this.isMeta(account, message.data.amount);
			}
			if (isMeta) {
				let data = this.decodeMeta(message.data.amount);
				callback(data);
			}
	        });
	};
};
