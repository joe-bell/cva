#!/usr/bin/env node
// Rejects em dash (—) and en dash (–) in docs prose. The writing-guidelines
// skill's house style bans them as punctuation — rephrase with a colon,
// comma, period, or parentheses instead. See AGENTS.md § Docs writing.
import { readFileSync } from "node:fs";

const DASH_PATTERN = /[—–]/;

const offenders = process.argv.slice(2).filter((file) => {
  const content = readFileSync(file, "utf-8");
  return DASH_PATTERN.test(content);
});

if (offenders.length > 0) {
  console.error(
    "Em dash (—) or en dash (–) found in docs prose — not allowed by the writing-guidelines house style. Rephrase with a colon, comma, period, or parentheses instead:\n",
  );
  for (const file of offenders) {
    const lines = readFileSync(file, "utf-8").split("\n");
    lines.forEach((line, i) => {
      if (DASH_PATTERN.test(line))
        console.error(`  ${file}:${i + 1}: ${line.trim()}`);
    });
  }
  process.exit(1);
}
