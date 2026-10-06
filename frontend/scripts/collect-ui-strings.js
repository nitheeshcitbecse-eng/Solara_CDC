// Lists every English text of the app's own interface, for the bundled translations.
//
//   1. COLLECT_UI_STRINGS=<runtime.json> npx jest __tests__/screens.test.js   (texts screens really show)
//   2. node scripts/collect-ui-strings.js <runtime.json>                       → src/i18n/strings.json
//   3. ../translator: python build_bundle.py                                   → src/i18n/<language>.json
//
// Texts seen at runtime are kept only if they are written in the source code (this drops sample data
// such as names). Texts only shown on errors or in popups are found by reading the source.
const fs = require("fs");
const path = require("path");
const { parse } = require("@babel/parser");
const traverse = require("@babel/traverse").default;

const SRC = path.join(__dirname, "..", "src");
const OUT = path.join(SRC, "i18n", "strings.json");

// Same rules as splitForTranslation / useTranslated in src/context/LanguageContext.js.
const HAS_LETTERS = /[A-Za-z]/;
const NOT_WORDS = /^(\S+@\S+\.\S+|https?:\/\/\S+|[A-Z]{2,5}\d*)$/;
const MAX_PIECE = 280;

// Props and object keys whose string values are shown to people.
const UI_NAMES = new Set([
  "title", "subtitle", "label", "placeholder", "message", "hint", "confirmText", "cancelText", "inputPlaceholder",
  "actionLabel", "nextLabel", "text", "cta", "question", "answer", "description", "emptyTitle", "emptyMessage", "badge",
]);
const UI_CALLS = new Set(["setMessage", "showAlert", "setAlertMessage", "setError", "useTranslated", "showError", "showSuccess"]);
// Code-like values that are never shown (icons, routes, styles…).
const CODE_LIKE = /^([a-z0-9]+([-_][a-z0-9]+)+|[a-z]+([A-Z][a-z0-9]*)+|[A-Z][a-zA-Z]+Screen|#[0-9a-fA-F]{3,8}|[a-z]+)$/;

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "i18n" ? [] : files(full);
    return entry.name.endsWith(".js") ? [full] : [];
  });
}

function usable(text) {
  const core = text.replace(/\s+/g, " ").trim();
  if (!core || core.length > MAX_PIECE || !HAS_LETTERS.test(core) || NOT_WORDS.test(core)) return null;
  return core;
}

// Walks up through `a ? "x" : "y"`, `x || "y"` and parentheses to the place the string is used.
function usage(p) {
  let current = p;
  while (["ConditionalExpression", "LogicalExpression", "ParenthesizedExpression"].includes(current.parentPath.node.type)) {
    current = current.parentPath;
  }
  return current.parentPath;
}

const sources = files(SRC).map((file) => ({ file, code: fs.readFileSync(file, "utf8") }));
const found = new Set();

for (const { file, code } of sources) {
  const ast = parse(code, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    JSXText(p) {
      const core = usable(p.node.value);
      if (core) found.add(core);
    },
    StringLiteral(p) {
      const core = usable(p.node.value);
      if (!core || CODE_LIKE.test(core)) return;
      const parent = usage(p);
      const node = parent.node;
      if (node.type === "JSXAttribute" && UI_NAMES.has(node.name.name)) found.add(core);
      else if (node.type === "JSXExpressionContainer" && parent.parentPath.node.type === "JSXAttribute" && UI_NAMES.has(parent.parentPath.node.name.name)) found.add(core);
      else if (node.type === "JSXExpressionContainer" && parent.parentPath.node.type === "JSXElement") found.add(core);
      else if (node.type === "ObjectProperty" && node.value === p.node && UI_NAMES.has(node.key.name || node.key.value)) found.add(core);
      else if (node.type === "ObjectProperty" && UI_NAMES.has(node.key.name || node.key.value)) found.add(core);
      else if (node.type === "CallExpression" && UI_CALLS.has(node.callee.name)) found.add(core);
    },
  });
}

const runtimeFile = process.argv[2];
if (runtimeFile) {
  const everything = sources.map((s) => s.code).join("\n");
  for (const text of JSON.parse(fs.readFileSync(runtimeFile, "utf8"))) {
    const core = usable(text);
    if (core && everything.includes(core)) found.add(core);
  }
}

const list = [...found].sort();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(list, null, 1) + "\n");
console.log(`${list.length} interface texts → ${path.relative(process.cwd(), OUT)}`);
