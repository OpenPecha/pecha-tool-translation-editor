const WSSharedDoc = require("./yjs/wsSharedDoc");
const utils = require("./yjs/utils");
const logger = require("../utils/logger");

const messageListener = (conn, doc, message) => {
	try {
		const encoder = utils.encoding.createEncoder();
		const decoder = utils.decoding.createDecoder(message);
		const messageType = utils.decoding.readVarUint(decoder);

		// eslint-disable-next-line default-casec
		switch (messageType) {
			case utils.messageSync:
				utils.encoding.writeVarUint(encoder, utils.messageSync);

				// Apply the sync message to the document
				utils.syncProtocol.readSyncMessage(decoder, encoder, doc, null);

				// Send response if needed
				if (utils.encoding.length(encoder) > 1) {
					utils.send(doc, conn, utils.encoding.toUint8Array(encoder));
				}

				break;

			case utils.messageAwareness:
				utils.awarenessProtocol.applyAwarenessUpdate(
					doc.awareness,
					utils.decoding.readVarUint8Array(decoder),
					conn,
				);
				break;
		}
	} catch (error) {
		console.error(error);
		doc.emit("error", [error]);
	}
};

module.exports = { WSSharedDoc, utils, messageListener };
