const AWS = require("aws-sdk");
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

const ses = new AWS.SES();

const verifyEmailAddress = async (emails) => {
  try {
    const verificationPromisses = emails.map(async (email) => {
      const params = {
        EmailAddress: email,
      };
      return await ses.verifyEmailIdentity(params).promise();
    });
    await Promise.all(verificationPromisses);
    return true;
  } catch (error) {
    console.error("Error verifying email addresses:", error);
  }
};

const sendEmail = async (emails, message) => {
  // Validate EMAIL_FROM environment variable
  if (!process.env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM environment variable is not configured");
  }

  const params = {
    Source: process.env.EMAIL_FROM,
    Destination: {
      ToAddresses: emails,
    },
    Message: {
      Subject: {
        Data: message.subject,
      },
      Body: {
        Text: {
          Data: message.text,
        },
      },
    },
  };
  try {
    const data = await ses.sendEmail(params).promise();
    return data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

module.exports = {
  verifyEmailAddress,
  sendEmail,
};
