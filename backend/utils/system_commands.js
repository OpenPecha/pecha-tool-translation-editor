const { exec } = require("child_process");
const { promisify } = require("util");
const execAsync = promisify(exec);

/**
 * Check if Pandoc is available on the system
 * @returns {Promise<boolean>} - True if Pandoc is available
 */
async function isPandocAvailable() {
  try {
    await execAsync("pandoc --version");
    return true;
  } catch (error) {
    console.log("⚠️ Pandoc not available:", error.message);
    return false;
  }
}

module.exports = {
  isPandocAvailable,
};
