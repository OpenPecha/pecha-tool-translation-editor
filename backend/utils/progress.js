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
    console.log(`⚠️ No SSE stream found for progressId: ${progressId}`);
    console.log(`📊 Available streams:`, Array.from(progressStreams.keys()));
    console.log(`📊 Total streams: ${progressStreams.size}`);
  }
}

module.exports = {
  sendProgress,
  progressStreams,
};
