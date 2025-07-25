const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();
const { auth, claimCheck } = require("express-oauth2-jwt-bearer");
const jwksClient = require("jwks-rsa");
// Auth0 configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

// Debug logging for environment variables
console.log("AUTH0_DOMAIN:", AUTH0_DOMAIN);
console.log("AUTH0_AUDIENCE:", AUTH0_AUDIENCE);

// Create Auth0 JWT validator middleware
const validateAuth0Token = auth({
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  audience: AUTH0_AUDIENCE,
  tokenSigningAlg: "RS256",
});

const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
});
function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.getPublicKey();
      callback(null, signingKey);
    }
  });
}
async function auth0VerifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        audience: AUTH0_AUDIENCE,
        issuer: `https://${AUTH0_DOMAIN}/`,
        algorithms: ["RS256"],
      },
      (err, decoded) => {
        if (err) {
          return reject(err);
        }
        resolve(decoded);
      }
    );
  });
}
/**
 * Middleware that authenticates requests using Auth0 access tokens
 */
const authenticate = [
  validateAuth0Token,
  async (req, res, next) => {
    try {
      // Debug logging
      console.log("req.auth:", req.auth);
      console.log("req.auth?.payload:", req.auth?.payload);

      // Get the user info from the validated token
      const id = req?.auth?.payload?.sub;
      if (!id) {
        console.log("No ID found in token payload");
        return res
          .status(401)
          .json({ error: "User ID claim missing from token" });
      }

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { id: id },
      });
      if (!user) {
        // Create user if they don't exist in our database
        const userEmail = req?.auth?.payload["https://pecha-tool/email"];
        const picture = req?.auth?.payload["https://pecha-tool/picture"];
        if (!userEmail || !picture) {
          return res
            .status(401)
            .json({ error: "Email claim missing from token" });
        }
        const newUser = await prisma.user.create({
          data: {
            id,
            email: userEmail,
            username: userEmail.split("@")[0],
            picture,
          },
        });

        req.user = {
          id: newUser.id,
          email: newUser.email,
        };

        return next();
      }

      // Attach user to request object
      req.user = {
        id: user.id,
        email: user.email,
      };

      next();
    } catch (error) {
      console.error("Authentication error:", error);
      return res.status(401).json({ error: "Authentication failed" });
    }
  },
];

/**
 * Optional authentication middleware - allows requests to proceed with or without authentication
 * If authenticated, attaches user to req.user; if not authenticated, req.user is undefined
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // No token provided, proceed without authentication
      req.user = undefined;
      return next();
    }

    // Apply Auth0 validation first
    validateAuth0Token(req, res, async (err) => {
      if (err) {
        // Authentication failed, proceed without authentication
        req.user = undefined;
        return next();
      }

      try {
        // Debug logging
        console.log("Optional auth - req.auth:", req.auth);
        console.log("Optional auth - req.auth?.payload:", req.auth?.payload);

        // Get the user info from the validated token
        const id = req?.auth?.payload?.sub;
        if (!id) {
          console.log("Optional auth - No ID found in token payload");
          // Invalid token, proceed without authentication
          req.user = undefined;
          return next();
        }

        // Find user in database
        const user = await prisma.user.findUnique({
          where: { id: id },
        });

        if (!user) {
          // Create user if they don't exist in our database
          const userEmail = req?.auth?.payload["https://pecha-tool/email"];
          const picture = req?.auth?.payload["https://pecha-tool/picture"];
          if (!userEmail || !picture) {
            // Invalid token claims, proceed without authentication
            req.user = undefined;
            return next();
          }

          const newUser = await prisma.user.create({
            data: {
              id,
              email: userEmail,
              username: userEmail.split("@")[0],
              picture,
            },
          });

          req.user = {
            id: newUser.id,
            email: newUser.email,
          };

          return next();
        }

        // Attach user to request object
        req.user = {
          id: user.id,
          email: user.email,
        };

        next();
      } catch (dbError) {
        console.log("Database error in optional auth:", dbError.message);
        req.user = undefined;
        next();
      }
    });
  } catch (error) {
    // If authentication fails, proceed without authentication
    console.log(
      "Optional authentication failed, proceeding without auth:",
      error.message
    );
    req.user = undefined;
    next();
  }
};

module.exports = { authenticate, optionalAuthenticate, auth0VerifyToken };
