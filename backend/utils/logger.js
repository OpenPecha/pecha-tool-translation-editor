const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Get current date for log file name
const getLogFileName = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.log`;
};

// Format log message with timestamp and level
const formatLogMessage = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    // Handle objects and errors
    if (data instanceof Error) {
      logMessage += `\n    Error: ${data.message}`;
      if (data.stack) {
        logMessage += `\n    Stack: ${data.stack}`;
      }
    } else if (typeof data === 'object') {
      try {
        logMessage += `\n    Data: ${JSON.stringify(data, null, 2)}`;
      } catch (e) {
        logMessage += `\n    Data: [Circular or Non-Serializable Object]`;
      }
    } else {
      logMessage += `\n    Data: ${data}`;
    }
  }
  
  return logMessage + '\n';
};

// Write log to file
const writeToLogFile = (message) => {
  const logFile = path.join(logsDir, getLogFileName());
  fs.appendFileSync(logFile, message);
};

// Log to console and file
const log = (level, message, data = null) => {
  const formattedMessage = formatLogMessage(level, message, data);
  
  // Log to console based on level
  switch (level.toLowerCase()) {
    case 'error':
      console.error(formattedMessage);
      break;
    case 'warn':
      console.warn(formattedMessage);
      break;
    case 'info':
      console.info(formattedMessage);
      break;
    case 'debug':
      console.debug(formattedMessage);
      break;
    default:
      console.log(formattedMessage);
  }
  
  // Write to log file
  writeToLogFile(formattedMessage);
};

// Logger interface
const logger = {
  error: (message, data = null) => log('error', message, data),
  warn: (message, data = null) => log('warn', message, data),
  info: (message, data = null) => log('info', message, data),
  debug: (message, data = null) => log('debug', message, data),
  
  // Log WebSocket events specifically
  ws: (event, docId, userId = null, data = null) => {
    const userInfo = userId ? `User: ${userId}` : 'Anonymous';
    log('info', `WebSocket ${event} | Doc: ${docId} | ${userInfo}`, data);
  }
};

module.exports = logger;
