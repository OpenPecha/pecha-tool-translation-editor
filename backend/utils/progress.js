const progressStreams = new Map();

function sendProgress(progressStreams, progressId, progress, message) {
	const stream = progressStreams.get(progressId);
	if (stream) {
		try {
			const progressData = JSON.stringify({ progress, message });

			stream.write(`data: ${progressData}\n\n`);
		} catch (error) {
			progressStreams.delete(progressId);
		}
	} else {
		console.log(`📊 Total streams: ${progressStreams.size}`);
	}
}

module.exports = {
	sendProgress,
	progressStreams,
};
