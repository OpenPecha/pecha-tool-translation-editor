require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const commentsRoutes = require("./routes/comments");
const versionsRoutes = require("./routes/versions");
const documentsRoutes = require("./routes/documents");
const pechaRoutes = require("./routes/pecha");
const textsRoutes = require("./routes/texts");
const userRoutes = require("./routes/user");
const projectRoutes = require("./routes/project");
const footnotesRoutes = require("./routes/footnote");
const apiCredentialsRoutes = require("./routes/apiCredentials");
const translateRoutes = require("./routes/translate");
const glossaryRoutes = require("./routes/glossary");
const standardizeRoutes = require("./routes/standardize");
const applyStandardizationRoutes = require("./routes/apply_standardization");
const workspaceRoutes = require("./routes/workspace");

const options = {
  info: {
    version: "1.0.0",
    title: "Pecha Translation Editor API",
    description: "API for the Pecha Translation Editor application",
    license: {
      name: "MIT",
    },
  },
  security: {
    BearerAuth: {
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    },
  },
  // Base directory which we use to locate your JSDOC files
  baseDir: __dirname,
  // Glob pattern to find your jsdoc files (multiple patterns can be added in an array)
  filesPattern: "./**/*.js",
  // URL where SwaggerUI will be rendered
  swaggerUIPath: "/docs",
  // Expose OpenAPI UI
  exposeSwaggerUI: true,
  // Expose Open API JSON Docs documentation in `apiDocsPath` path.
  exposeApiDocs: true,
  // Open API JSON Docs endpoint.
  apiDocsPath: "/api-docs.json",
  // Set non-required fields as nullable by default
  notRequiredAsNullable: false,
  // You can customize your UI options.
  swaggerUiOptions: {
    explorer: true,
    docExpansion: "list",
    filter: true,
  },
  // multiple option in case you want more that one instance
  multiple: false,
  // Exclude routes that don't have explicit documentation
  ignorePaths: ["/"],
};

const expressJSDocSwagger = require("express-jsdoc-swagger");

const app = express();

const ALLOWED_URLS = process.env.ALLOWED_URLS
  ? process.env.ALLOWED_URLS.split(",")
  : ["http://localhost:3000"];
app.use(
  cors({
    origin: ALLOWED_URLS, // reflects the request origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

expressJSDocSwagger(app)(options);

const server = http.createServer(app);

app.get("/", (req, res) => {
  res.json({
    status: "success",
    message: "API is running properly",
    version: "1.0.0",
  });
});

app.use(express.json({ limit: "50mb" })); // Increase JSON payload limit
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use("/comments", commentsRoutes);
app.use("/versions", versionsRoutes);
app.use("/documents", documentsRoutes);
app.use("/pecha", pechaRoutes);
app.use("/texts", textsRoutes);
app.use("/users", userRoutes);
app.use("/projects", projectRoutes);
app.use("/api-credentials", apiCredentialsRoutes);
app.use("/footnotes", footnotesRoutes);
app.use("/translate", translateRoutes);
app.use("/glossary", glossaryRoutes);
app.use("/standardize", standardizeRoutes);
app.use("/standardize", applyStandardizationRoutes);
app.use("/workspace", workspaceRoutes);

const PORT = process.env.PORT || 9000;
server.listen(PORT, () => {
  console.info(`Server running on http://localhost:${PORT}`);
});
