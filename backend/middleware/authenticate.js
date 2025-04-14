const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const prisma = new PrismaClient();
const { auth, claimCheck } = require('express-oauth2-jwt-bearer');

// Auth0 configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;

// Create Auth0 JWT validator middleware
const validateAuth0Token = auth({
  issuerBaseURL: `https://${AUTH0_DOMAIN}/`,
  audience: AUTH0_AUDIENCE,
  tokenSigningAlg: 'RS256'
});

/**
 * Middleware that authenticates requests using Auth0 access tokens
 */
const authenticateToken = async (req, res, next) => {
  try {
    // First validate the token with Auth0
    await validateAuth0Token(req, res, async () => {
      // Get the user info from the validated token
      const id=req.auth.payload['sub'];
      if(!id){
        return res.status(401).json({ error: "User ID claim missing from token" });
      }

      // Find user in database
      const user = await prisma.user.findUnique({
        where: { id: id }
      });
      
      if (!user) {
        // Create user if they don't exist in our database
        const userEmail = req.auth.payload["https://pecha-tool/email"];
        if (!userEmail) {
          return res.status(401).json({ error: "Email claim missing from token" });
        }
        const newUser = await prisma.user.create({
          data: {
            id,
            email: userEmail,
            username: userEmail.split("@")[0]
          }
        });
        
        req.user = {
          id: newUser.id,
          email: newUser.email
        };
        
        return next();
      }
      
      // Attach user to request object
      req.user = {
        id: user.id,
        email: user.email
      };
      
      next();
    });
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({ error: "Authentication failed" });
  }
};

module.exports = authenticateToken;
