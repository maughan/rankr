import { parseSlugParam, slugify } from "../lib/listUrl";

const cases: [string, string, string][] = [
  // [input, label, expected-route]
  ["chocolate-bars-Kgsbm47R", "canonical URL", "canonical or redirect"],
  ["Kgsbm47R", "bare short_id (no slug)", "redirect → canonical"],
  [
    "old-slug-Kgsbm47R",
    "stale slug (will differ in DB)",
    "redirect → canonical",
  ],
  ["5", "bare integer (old URL)", "redirect via int path"],
  ["14", "another integer", "redirect via int path"],
  ["5.0", "float — must NOT match int path", "notfound"],
  [" 5", "padded int — must NOT match", "notfound"],
  ["not-valid-!!", "garbage", "notfound"],
  ["", "empty string", "notfound"],
];

function classifyParam(param: string): string {
  const parsed = parseSlugParam(param);
  const asInt = Number(param);
  const isInt = Number.isInteger(asInt) && asInt > 0 && String(asInt) === param;
  if (parsed)
    return `slug+shortId  shortId=${parsed.shortId} slug="${parsed.slug}"`;
  if (isInt) return `integer       id=${asInt}`;
  return "notfound";
}

let ok = true;
for (const [input, label] of cases) {
  const result = classifyParam(input);
  console.log(`${label.padEnd(38)} → ${result}`);

  // Basic sanity: garbage and empty must not produce a valid path
  if (
    (input === "" ||
      input.includes("!") ||
      input.includes(" ") ||
      input.includes(".")) &&
    result !== "notfound"
  ) {
    console.error(`  FAIL: expected notfound, got "${result}"`);
    ok = false;
  }
}

console.log("\n=== slugify edge cases ===");
const slugCases = [
  ["Chocolate Bars", "chocolate-bars"],
  ["Über Röck", "uber-rock"],
  ["   ---   ", "list"],
  ["🔥🔥🔥", "list"],
  ["A".repeat(80), 60], // truncation
  [
    "word ".repeat(12).trim(),
    "word-word-word-word-word-word-word-word-word-word-word-word".slice(0, 60),
  ],
];
for (const [input, expected] of slugCases) {
  const result = slugify(input as string);
  const pass =
    typeof expected === "number"
      ? result.length <= expected
      : result === expected;
  console.log(
    `${pass ? "✓" : "✗"} slugify(${JSON.stringify((input as string).slice(0, 20))}) → "${result}"`,
  );
  if (!pass) ok = false;
}

process.exit(ok ? 0 : 1);
