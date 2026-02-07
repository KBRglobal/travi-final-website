// Export all Replit secrets to a file
// Run: node export.js
// Output: secrets-export.txt

const fs = require("node:fs");
const env = process.env;
const keys = Object.keys(env).sort();
const lines = [];

for (const k of keys) {
  // Skip internal Replit/system vars
  if (k.startsWith("__")) continue;
  if (k === "_") continue;
  if (k === "PWD") continue;
  if (k === "HOME") continue;
  if (k === "USER") continue;
  if (k === "SHELL") continue;
  if (k === "PATH") continue;
  if (k === "TERM") continue;
  if (k === "LANG") continue;
  if (k === "SHLVL") continue;
  if (k === "LOGNAME") continue;
  if (k === "HOSTNAME") continue;
  if (k === "OLDPWD") continue;
  if (k === "REPL_ID") continue;
  if (k === "REPL_SLUG") continue;
  if (k === "REPL_OWNER") continue;
  if (k === "REPLIT_DB_URL") continue;
  if (k === "REPLIT_CLUSTER") continue;
  if (k === "REPLIT_ENVIRONMENT") continue;
  if (k === "REPLIT_DEV_DOMAIN") continue;
  if (k === "REPLIT_DEPLOYMENT") continue;
  if (k.startsWith("REPLIT_")) continue;
  if (k.startsWith("NIX_")) continue;
  if (k.startsWith("XDG_")) continue;
  if (k.startsWith("npm_")) continue;

  const val = env[k] || "";
  lines.push(k + "=" + val);
}

const out = lines.join("\n");
fs.writeFileSync("secrets-export.txt", out);
console.log("Exported " + lines.length + " vars");
console.log("File: secrets-export.txt");
console.log("---");
console.log(out);
