const progressStreams = new Map();

function sendProgress(progressStreams, progressId, progress, message) {
  const stream = progressStreams.get(progressId);
  if (stream) {
    const progressData = JSON.stringify({ progress, message });

    stream.write(`data: ${progressData}\n\n`);
  }
}

module.exports = {
  sendProgress,
  progressStreams,
};
