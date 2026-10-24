/**
 * Code-quality metrics for the coding-standard rollout. Same file in every frontend repo.
 *
 * Usage:  node scripts/code-metrics.mjs [--json] [--list-commented-code]
 *
 * Measures src/**\/*.{js,jsx}: total lines, files over 300 lines, comment lines, commented-out-code lines,
 * console.* calls, magic numbers (same no-magic-numbers settings as eslint.config.js), nested ternaries.
 * Uses only ESLint's own parser (ESLint is already a devDependency), so it needs no extra package.
 */
import fs from "node:fs";
import path from "node:path";
import { Linter } from "eslint";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const MAX_FILE_LINES = 300;
const MAGIC_NUMBER_OPTIONS = {
  ignore: [-1, 0, 1, 2, 100],
  ignoreArrayIndexes: true,
  ignoreDefaultValues: true,
  ignoreClassFieldInitialValues: true,
  enforceConst: true,
};
const CODE_BLOCK_MAJORITY = 0.6;

const linter = new Linter({ configType: "flat" });
const LANGUAGE_OPTIONS = {
  ecmaVersion: "latest",
  sourceType: "module",
  parserOptions: { ecmaFeatures: { jsx: true } },
};

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return /\.(js|jsx)$/.test(entry.name) ? [full] : [];
  });
}

/** True when `text` parses as JavaScript/JSX (as a module, a function body or a JSX fragment). */
function parses(text) {
  const candidates = [text, `async function wrapper(){\n${text}\n}`, `({\n${text}\n})`];
  // JSX children accept any prose, so only try the fragment wrapper when the text starts like markup.
  if (/^\s*[<{]/.test(text)) candidates.push(`<>\n${text}\n</>`);
  return candidates.some((candidate) => {
    const messages = linter.verify(candidate, { languageOptions: LANGUAGE_OPTIONS, rules: {} });
    return !messages.some((message) => message.fatal);
  });
}

const CODE_SIGNAL = /[;{}()[\]=<>]|\b(const|let|var|return|import|export|await|function)\b/;
const PROSE_START = /^(TODO|NOTE|FIXME|HACK|eslint|prettier|@\w+|https?:)/i;
// Section headings such as "FOOTER (PRICE & BUTTON)" parse as a call but are prose.
const UPPERCASE_HEADING = /^[A-Z0-9 &()/,.:'-]+$/;

/** Heuristic: is this comment text a piece of source code rather than an explanation? */
function looksLikeCode(text) {
  const trimmed = text.trim();
  if (
    !trimmed ||
    PROSE_START.test(trimmed) ||
    UPPERCASE_HEADING.test(trimmed) ||
    !CODE_SIGNAL.test(trimmed)
  )
    return false;
  return parses(trimmed);
}

/** Strip comment markers: "// x", " * x", "{/* x *\/}". */
const commentBodyLines = (comment) =>
  comment.value.split("\n").map((line) => line.replace(/^\s*\*(?!\/)\s?/, ""));

/**
 * Group adjacent // comments into blocks, then classify each block.
 * Returns the set of 1-based line numbers that hold commented-out code.
 */
function findCommentedCodeLines(comments) {
  const blocks = [];
  for (const comment of comments) {
    const previous = blocks.at(-1);
    const isLine = comment.type === "Line";
    if (isLine && previous?.type === "Line" && previous.endLine === comment.loc.start.line - 1) {
      previous.items.push(comment);
      previous.endLine = comment.loc.end.line;
    } else {
      blocks.push({ type: comment.type, items: [comment], endLine: comment.loc.end.line });
    }
  }

  const codeLines = new Set();
  for (const block of blocks) {
    const lines = block.items.flatMap((comment) =>
      commentBodyLines(comment).map((text, offset) => ({
        text,
        line: comment.loc.start.line + offset,
      }))
    );
    const nonEmpty = lines.filter((entry) => entry.text.trim());
    if (!nonEmpty.length) continue;
    if (looksLikeCode(lines.map((entry) => entry.text).join("\n"))) {
      nonEmpty.forEach((entry) => codeLines.add(entry.line));
      continue;
    }
    const codeish = nonEmpty.filter((entry) => looksLikeCode(entry.text));
    const isMostlyCode =
      codeish.length / nonEmpty.length >= CODE_BLOCK_MAJORITY && nonEmpty.length > 1;
    (isMostlyCode ? nonEmpty : codeish).forEach((entry) => codeLines.add(entry.line));
  }
  return codeLines;
}

const collectorPlugin = {
  rules: {
    collect: {
      meta: { schema: [] },
      create(context) {
        const sourceCode = context.sourceCode;
        const stats = { consoleCalls: 0, nestedTernaryLines: new Set() };
        context.report({ loc: { line: 1, column: 0 }, message: "stats", data: {} });
        return {
          CallExpression(node) {
            if (node.callee.type === "MemberExpression" && node.callee.object.name === "console") {
              stats.consoleCalls += 1;
            }
          },
          ConditionalExpression(node) {
            const branches = [node.test, node.consequent, node.alternate];
            if (branches.some((branch) => branch.type === "ConditionalExpression")) {
              stats.nestedTernaryLines.add(node.loc.start.line);
            }
          },
          "Program:exit"() {
            const comments = sourceCode.getAllComments();
            const commentLines = new Set();
            for (const comment of comments) {
              for (let line = comment.loc.start.line; line <= comment.loc.end.line; line += 1) {
                commentLines.add(line);
              }
            }
            collectorPlugin.last = {
              commentLines: commentLines.size,
              // Trailing comments after live code ("useState(null); // { checking, available }") are shape
              // hints, not dead code, so only comments that start their line (or a JSX {/* */}) are checked.
              commentedCodeLines: findCommentedCodeLines(
                comments.filter((comment) => {
                  const before = sourceCode.lines[comment.loc.start.line - 1].slice(
                    0,
                    comment.loc.start.column
                  );
                  return before.trim() === "" || before.trim().endsWith("{");
                })
              ),
              consoleCalls: stats.consoleCalls,
              nestedTernaries: stats.nestedTernaryLines.size,
            };
          },
        };
      },
    },
  },
};

function analyseFile(file) {
  const text = fs.readFileSync(file, "utf8");
  const messages = linter.verify(text, {
    languageOptions: LANGUAGE_OPTIONS,
    plugins: { metrics: collectorPlugin },
    rules: { "metrics/collect": "warn", "no-magic-numbers": ["warn", MAGIC_NUMBER_OPTIONS] },
  });
  const fatal = messages.find((message) => message.fatal);
  if (fatal) throw new Error(`${file}: ${fatal.message}`);
  const lines = text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
  return {
    file: path.relative(ROOT, file),
    lines,
    magicNumbers: messages.filter((message) => message.ruleId === "no-magic-numbers").length,
    ...collectorPlugin.last,
  };
}

const files = walk(SRC).map(analyseFile);
const sum = (key) => files.reduce((total, file) => total + file[key], 0);
const commentedCode = files.reduce((total, file) => total + file.commentedCodeLines.size, 0);
const largeFiles = files
  .filter((file) => file.lines > MAX_FILE_LINES)
  .sort((a, b) => b.lines - a.lines);
const heavyCommentFiles = files.filter((file) => file.commentLines / file.lines > 0.3);

const summary = {
  files: files.length,
  totalLines: sum("lines"),
  filesOver300: largeFiles.length,
  commentLines: sum("commentLines"),
  commentedOutCodeLines: commentedCode,
  filesOver30PercentComments: heavyCommentFiles.length,
  consoleCalls: sum("consoleCalls"),
  magicNumbers: sum("magicNumbers"),
  nestedTernaries: sum("nestedTernaries"),
};

if (process.argv.includes("--json")) {
  const perFile = files.map(({ commentedCodeLines, ...rest }) => ({
    ...rest,
    commentedCodeLines: commentedCodeLines.size,
  }));
  console.log(JSON.stringify({ summary, files: perFile }, null, 2));
} else if (process.argv.includes("--list-commented-code")) {
  for (const file of files) {
    if (!file.commentedCodeLines.size) continue;
    const ranges = [...file.commentedCodeLines].sort((a, b) => a - b);
    console.log(`${file.file}: ${ranges.length} lines -> ${ranges.join(",")}`);
  }
} else {
  for (const [key, value] of Object.entries(summary)) console.log(`${key.padEnd(30)} ${value}`);
  console.log(`\nFiles over ${MAX_FILE_LINES} lines:`);
  largeFiles.forEach((file) => console.log(`  ${String(file.lines).padStart(5)}  ${file.file}`));
  console.log("\nFiles with more than 30% comment lines:");
  heavyCommentFiles.forEach((file) =>
    console.log(`  ${Math.round((file.commentLines / file.lines) * 100)}%  ${file.file}`)
  );
}
