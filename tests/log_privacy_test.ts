// Guards reviewer anonymity: no console.* call in routes/ or utils/ may log
// reviewer identity, reputation, the session object or session secrets.
//
// Runs under a bare `deno test` with no permissions. Reading a directory
// needs --allow-read, so every source file is imported as text below (static
// imports need no permission). The list cannot fall behind silently: the test
// follows relative imports from the Fresh manifest and fails when it reaches
// a file that is not listed, and with read access (`deno task test`) a
// second test walks routes/ and utils/ and fails on any file not reached.
import { assert, assertEquals } from "$std/assert/mod.ts";
import { walk } from "$std/fs/walk.ts";
import { fromFileUrl } from "$std/path/mod.ts";
import manifestSource from "../fresh.gen.ts" with { type: "text" };
import src1 from "../components/Button.tsx" with { type: "text" };
import src2 from "../islands/AuthButton.tsx" with { type: "text" };
import src3 from "../islands/Counter.tsx" with { type: "text" };
import src4 from "../islands/EthosProfileSearch.tsx" with { type: "text" };
import src5 from "../islands/KairosAgentSidebar.tsx" with { type: "text" };
import src6 from "../islands/ReviewForm.tsx" with { type: "text" };
import src7 from "../routes/_404.tsx" with { type: "text" };
import src8 from "../routes/_app.tsx" with { type: "text" };
import src9 from "../routes/api/auth/csrf.ts" with { type: "text" };
import src10 from "../routes/api/auth/me.ts" with { type: "text" };
import src11 from "../routes/api/auth/reputation.ts" with { type: "text" };
import src12 from "../routes/api/debug/reputation.ts" with { type: "text" };
import src13 from "../routes/api/debug/x-account-resolution.ts" with {
  type: "text",
};
import src14 from "../routes/api/discord/test.ts" with { type: "text" };
import src15 from "../routes/api/joke.ts" with { type: "text" };
import src16 from "../routes/api/kairos-stats.ts" with { type: "text" };
import src17 from "../routes/api/reviews/submit.ts" with { type: "text" };
import src18 from "../routes/api/slash/submit.ts" with { type: "text" };
import src19 from "../routes/auth/logout.ts" with { type: "text" };
import src20 from "../routes/auth/twitter.ts" with { type: "text" };
import src21 from "../routes/auth/twitter/callback.ts" with { type: "text" };
import src22 from "../routes/greet/[name].tsx" with { type: "text" };
import src23 from "../routes/index.tsx" with { type: "text" };
import src24 from "../utils/blockchain.ts" with { type: "text" };
import src25 from "../utils/discord.ts" with { type: "text" };
import src26 from "../utils/privacy.ts" with { type: "text" };
import src27 from "../utils/security.ts" with { type: "text" };

/** Source text by repo-relative path. Add a line here for every new file. */
const SOURCES: Record<string, string> = {
  "components/Button.tsx": src1,
  "islands/AuthButton.tsx": src2,
  "islands/Counter.tsx": src3,
  "islands/EthosProfileSearch.tsx": src4,
  "islands/KairosAgentSidebar.tsx": src5,
  "islands/ReviewForm.tsx": src6,
  "routes/_404.tsx": src7,
  "routes/_app.tsx": src8,
  "routes/api/auth/csrf.ts": src9,
  "routes/api/auth/me.ts": src10,
  "routes/api/auth/reputation.ts": src11,
  "routes/api/debug/reputation.ts": src12,
  "routes/api/debug/x-account-resolution.ts": src13,
  "routes/api/discord/test.ts": src14,
  "routes/api/joke.ts": src15,
  "routes/api/kairos-stats.ts": src16,
  "routes/api/reviews/submit.ts": src17,
  "routes/api/slash/submit.ts": src18,
  "routes/auth/logout.ts": src19,
  "routes/auth/twitter.ts": src20,
  "routes/auth/twitter/callback.ts": src21,
  "routes/greet/[name].tsx": src22,
  "routes/index.tsx": src23,
  "utils/blockchain.ts": src24,
  "utils/discord.ts": src25,
  "utils/privacy.ts": src26, // not imported by any route; still scanned
  "utils/security.ts": src27,
};

const ROOT = new URL("../", import.meta.url);
const MANIFEST = "fresh.gen.ts";
const SCAN_DIRS = ["routes/", "utils/"];

interface Rule {
  pattern: RegExp;
  /** A console call that must be caught; proves the rule works. */
  planted: string;
}

const FORBIDDEN: Rule[] = [
  { pattern: /\bsessionCookie\b/, planted: `console.log("c", sessionCookie);` },
  { pattern: /\baccessToken\b/, planted: `console.log({ accessToken });` },
  { pattern: /\baccess_token\b/, planted: `console.log(data.access_token);` },
  { pattern: /\bexpectedState\b/, planted: `console.log(expectedState);` },
  {
    pattern: /\breviewerUsername\b/,
    planted: `console.log({ reviewerUsername });`,
  },
  { pattern: /\buser\.username\b/, planted: `console.log(user.username);` },
  { pattern: /\buser\.id\b/, planted: "console.log(`k_${session.user.id}`);" },
  // The whole session or its user object: username, id, name, access token.
  { pattern: /\bsession\b(?!\??\.)/, planted: `console.log("s", session);` },
  {
    pattern: /\bsession\??\.user\b(?!\??\.)/,
    planted: `console.log({ user: session.user });`,
  },
  // The reviewer's Ethos score and tier. The app publishes "reputable+" for
  // every reviewer so that the tier stays hidden; logs must not reveal it.
  { pattern: /\bscore\b/, planted: `console.log({ score: rep?.score });` },
  {
    pattern: /\breviewerReputationLevel\b/,
    planted: `console.log("tier", reviewerReputationLevel);`,
  },
];

// Snippets that match a rule above but are clearly not about the reviewer.
// They are removed from a call's arguments before the rules run.
const ALLOWED: RegExp[] = [
  // The review's sentiment (0-2), not a reputation score.
  /\bscore:\s*reviewData\.score\b/, // routes/api/reviews/submit.ts
  /\bsentiment:\s*score\b/, // utils/blockchain.ts
  /\bscore:\s*parsedLog\.args\.score\.toString\(\)/, // utils/blockchain.ts
  // The target's public score: the Kairos agent's own stats.
  /\bscore:\s*userProfile\.score\b/, // routes/api/kairos-stats.ts
];

const CONSOLE_CALL = /console\.(log|error|warn|info|debug)\s*\(/g;

function isTestFile(path: string): boolean {
  return /(^|\/)tests\//.test(path) || /(_|\.)test\.tsx?$/.test(path);
}

/**
 * Returns the argument text of the console call starting at `openParen`,
 * with string literal contents blanked out so that message text never
 * matches a rule. Template expressions (`${...}`) are kept.
 */
function callArguments(source: string, openParen: number): string {
  const contexts = [{ paren: 0, brace: 0 }];
  let quote: string | null = null;
  let out = "";
  for (let i = openParen; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (ch === "\\") i++;
      else if (ch === quote) quote = null;
      else if (quote === "`" && ch === "$" && source[i + 1] === "{") {
        contexts.push({ paren: 0, brace: 0 });
        quote = null;
        out += " ";
        i++;
      }
      continue;
    }
    const ctx = contexts[contexts.length - 1];
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += " ";
      continue;
    }
    if (ch === "(") ctx.paren++;
    else if (ch === ")") {
      ctx.paren--;
      if (ctx.paren === 0 && contexts.length === 1) return out.slice(1);
    } else if (ch === "{") ctx.brace++;
    else if (ch === "}") {
      if (ctx.brace > 0) ctx.brace--;
      else if (contexts.length > 1) {
        contexts.pop();
        quote = "`";
        out += " ";
        continue;
      }
    }
    out += ch;
  }
  return out.slice(1);
}

function lineOf(source: string, index: number): number {
  return source.slice(0, index).split("\n").length;
}

/** Violations in one source file, as "path:line logs <pattern>". */
function scanSource(source: string, relative: string): string[] {
  const violations: string[] = [];
  for (const match of source.matchAll(CONSOLE_CALL)) {
    const args = callArguments(source, match.index + match[0].length - 1);
    const checked = ALLOWED.reduce(
      (text, allowed) => text.replace(allowed, ""),
      args,
    );
    for (const { pattern } of FORBIDDEN) {
      if (pattern.test(checked)) {
        violations.push(
          `${relative}:${lineOf(source, match.index)} logs ${pattern.source}`,
        );
      }
    }
  }
  return violations;
}

const IMPORT_SPECIFIERS = [
  /\bfrom\s*["']([^"']+)["']/g,
  /\bimport\s*["']([^"']+)["']/g,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
];

/** Reads a listed source file; a reachable file that is not listed fails loudly. */
function readSource(relative: string): string {
  const source = SOURCES[relative];
  if (source === undefined) {
    throw new Error(
      `${relative} is not listed in SOURCES in tests/log_privacy_test.ts`,
    );
  }
  return source;
}

/** Every local module reachable from the manifest, by repo-relative path. */
// Throws when a reachable file is missing from SOURCES.
function reachableModules(): Map<string, string> {
  const sources = new Map<string, string>([[MANIFEST, manifestSource]]);
  const queue = [MANIFEST];
  while (queue.length > 0) {
    const from = queue.shift()!;
    for (const regex of IMPORT_SPECIFIERS) {
      for (const [, specifier] of sources.get(from)!.matchAll(regex)) {
        if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
          continue;
        }
        const resolved = new URL(specifier, new URL(from, ROOT)).href;
        if (!resolved.startsWith(ROOT.href) || !/\.tsx?$/.test(resolved)) {
          continue;
        }
        const relative = resolved.slice(ROOT.href.length);
        if (sources.has(relative) || !relative.includes("/")) continue;
        sources.set(relative, readSource(relative));
        queue.push(relative);
      }
    }
  }
  return sources;
}

function inScope(relative: string): boolean {
  return SCAN_DIRS.some((dir) => relative.startsWith(dir)) &&
    !isTestFile(relative);
}

Deno.test("console logs never include reviewer identity, reputation or session secrets", () => {
  const reached = reachableModules();
  assert(
    reached.size >= 10,
    `only ${reached.size} files reached from ${MANIFEST}`,
  );
  const violations: string[] = [];
  for (const [relative, source] of Object.entries(SOURCES)) {
    if (inScope(relative)) violations.push(...scanSource(source, relative));
  }
  assertEquals(
    violations,
    [],
    `Forbidden identifiers in logs:\n${violations.join("\n")}`,
  );
});

Deno.test("the scan catches a planted violation for every rule", () => {
  for (const { pattern, planted } of FORBIDDEN) {
    const found = scanSource(planted, "planted.ts");
    assert(
      found.some((v) => v.endsWith(`logs ${pattern.source}`)),
      `${planted} was not caught by ${pattern}`,
    );
  }
  // Message text alone is fine; allowed snippets are fine.
  assertEquals(
    scanSource(`console.log("No session cookie found");`, "ok.ts"),
    [],
  );
  assertEquals(
    scanSource(
      `console.log("Sentiment:", { score: reviewData.score });`,
      "ok.ts",
    ),
    [],
  );
  // Template expressions are still inspected.
  assertEquals(
    scanSource(
      "console.log(`user ${session.user.username} (${score})`);",
      "t.ts",
    ),
    ["t.ts:1 logs \\buser\\.username\\b", "t.ts:1 logs \\bscore\\b"],
  );
});

const canRead =
  (await Deno.permissions.query({ name: "read", path: fromFileUrl(ROOT) }))
    .state === "granted";

Deno.test({
  name:
    "every file in routes/ and utils/ is listed in SOURCES (needs --allow-read: `deno task test`)",
  ignore: !canRead,
  async fn() {
    const missing: string[] = [];
    for (const dir of SCAN_DIRS) {
      for await (
        const entry of walk(fromFileUrl(new URL(dir, ROOT)), {
          exts: [".ts", ".tsx"],
        })
      ) {
        const relative = entry.path.slice(fromFileUrl(ROOT).length);
        if (inScope(relative) && !(relative in SOURCES)) {
          missing.push(relative);
        }
      }
    }
    assertEquals(
      missing,
      [],
      `Not listed in SOURCES: ${missing.join(", ")}`,
    );
  },
});
