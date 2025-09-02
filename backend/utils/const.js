const path = require("path");

const TEMPLATE_PATH = path.join(__dirname, "..", "static", "template.docx");
const TEMPLATE_SA_PATH = path.join(__dirname, "..", "static", "template_sa.docx");
const TEMPLATE_BO_SA_PATH = path.join(__dirname, "..", "static", "template_bo_sa.docx");
const MAX_CHAR_SOURCE_TRANSLATION_PAGE = 1400;

/** Max characters per template page */
const MAX_CHAR_PER_TEMPLATE_PAGE = 1500;


const TEMPLATE_MAP = {
  sa: TEMPLATE_SA_PATH,
  bo_sa: TEMPLATE_BO_SA_PATH,
  en: TEMPLATE_PATH,
};

module.exports = {
  MAX_CHAR_SOURCE_TRANSLATION_PAGE,
  MAX_CHAR_PER_TEMPLATE_PAGE,
  TEMPLATE_PATH,
  TEMPLATE_MAP,
};
