/**
 * Behaviour-equivalence build (proof tool for refactors). Same file in every frontend repo.
 *
 * Bundles the app's OWN source with esbuild (already installed as a Vite dependency), minified, every npm
 * package left external, and writes a MANIFEST.txt of content hashes. Comments, formatting and unused imports
 * do not change the output, so two manifests that match prove two source trees behave identically.
 *
 * Usage: node scripts/proxy-build.mjs <outDir> [--drop-console-log]
 */
import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const repo = process.cwd();
const [out, flag] = process.argv.slice(2);
const entry = ["src/main.jsx", "src/main.js", "src/index.jsx"]
  .map((e) => path.join(repo, e))
  .find(fs.existsSync);
fs.rmSync(out, { recursive: true, force: true });
const externalPlugin = {
  name: "externals",
  setup(build) {
    build.onResolve({ filter: /^[^./]/ }, (args) => ({
      path: args.path,
      external: true,
      sideEffects: false,
    }));
  },
};
const result = await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  splitting: true,
  format: "esm",
  outdir: out,
  minify: true,
  jsx: "automatic",
  loader: {
    ".js": "jsx",
    ".png": "file",
    ".jpg": "file",
    ".jpeg": "file",
    ".svg": "file",
    ".webp": "file",
    ".gif": "file",
    ".mp4": "file",
    ".woff2": "file",
    ".woff": "file",
    ".ttf": "file",
  },
  assetNames: "assets/[name]-[hash]",
  chunkNames: "chunks/[name]-[hash]",
  entryNames: "[name]",
  metafile: true,
  logLevel: "error",
  legalComments: "none",
  pure: flag === "--drop-console-log" ? ["console.log"] : [],
  plugins: [externalPlugin],
});
fs.writeFileSync(path.join(out, "meta.json"), JSON.stringify(result.metafile));
const files = [];
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : files.push(p);
  });
walk(out);
const lines = files
  .filter((f) => !f.endsWith("meta.json"))
  .sort()
  .map(
    (f) =>
      `${crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0, 16)}  ${fs.statSync(f).size.toString().padStart(8)}  ${path.relative(out, f)}`
  );
fs.writeFileSync(path.join(out, "MANIFEST.txt"), lines.join("\n") + "\n");
const inputs = Object.keys(result.metafile.inputs);
console.log(`built ${lines.length} files from ${inputs.length} inputs`);
