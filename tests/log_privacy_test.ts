// Guards reviewer anonymity: no console.* call in routes/ or utils/ may log
// reviewer identity or session secrets. Scans source files (not tests) and
// fails on any console call whose arguments mention a forbidden identifier.
import { assertEquals } from "$std/assert/mod.ts";
import { walk } from "$std/fs/walk.ts";
import { fromFileUrl, join } from "$std/path/mod.ts";

const ROOT = fromFileUrl(new URL("../", import.meta.url));
const SCAN_DIRS = ["routes", "utils"];

const FORBIDDEN: RegExp[] = [
  /\bsessionCookie\b/,
  /\baccessToken\b/,
  /\baccess_token\b/,
  /\bexpectedState\b/,
  /\breviewerUsername\b/,
  /\buser\.username\b/,
  /\buser\.id\b/,
];

const CONSOLE_CALL = /console\.(log|error|warn|info|debug)\s*\(/g;

function isTestFile(path: string): boolean {
  return /(^|\/)tests\//.test(path) || /(_|\.)test\.tsx?$/.test(path);
}

/** Returns the full argument text of the console call starting at `openParen`. */
function callArguments(source: string, openParen: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    else if (ch === "(") depth++;
    else if (ch === ")") {
      depth--;
      if (depth === 0) return source.slice(openParen + 1, i);
    }
  }
  return source.slice(openParen + 1);
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

Deno.test("console logs never include reviewer identity or session secrets", async () => {
  const violations: string[] = [];

  for (const dir of SCAN_DIRS) {
    for await (
      const entry of walk(join(ROOT, dir), { exts: [".ts", ".tsx"] })
    ) {
      const relative = entry.path.slice(ROOT.length);
      if (isTestFile(relative)) continue;

      const source = await Deno.readTextFile(entry.path);
      for (const match of source.matchAll(CONSOLE_CALL)) {
        const openParen = match.index + match[0].length - 1;
        const args = callArguments(source, openParen);
        for (const pattern of FORBIDDEN) {
          if (pattern.test(args)) {
            violations.push(
              `${relative}:${
                lineOf(source, match.index)
              } logs ${pattern.source}`,
            );
          }
        }
      }
    }
  }

  assertEquals(
    violations,
    [],
    `Forbidden identifiers in logs:\n${violations.join("\n")}`,
  );
});
