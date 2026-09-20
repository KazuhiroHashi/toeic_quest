// TOEIC QUEST - enemy art generator (OpenAI gpt-image-1)
//
// Generates assets/enemies/<id>.png for each enemy using one shared style so
// all 32 monsters look like one set. Reads prompts from tools/art_prompts.json.
//
// Usage:
//   OPENAI_API_KEY=sk-... node tools/gen_art.mjs               # all 32
//   OPENAI_API_KEY=sk-... node tools/gen_art.mjs --pilot       # 4 pilot enemies
//   OPENAI_API_KEY=sk-... node tools/gen_art.mjs slime,rat     # specific ids
//   node tools/gen_art.mjs --pilot --dry-run                   # print prompts, no API call
//   ...optional: --quality=low|medium|high  (default medium)   --force (overwrite)
//   ...optional: --model=<id>   (default gpt-image-1; set to your account's
//                current image model id, e.g. gpt-image-2, or via env
//                OPENAI_IMAGE_MODEL). The API needs the EXACT model id string.
//
// IMPORTANT: this calls the OpenAI *Images API*, which is pay-as-you-go and is
// billed separately from ChatGPT Plus. Plus alone does NOT cover API calls.
// Cost (one-time): ~$0.01 (low) / ~$0.04 (medium) / ~$0.17 (high) per image.
"use strict";

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "assets", "enemies");
const PROMPTS = JSON.parse(fs.readFileSync(path.join(__dirname, "art_prompts.json"), "utf8"));
const STYLE = PROMPTS._style;
const PILOT = ["slime", "rat", "gen_r", "maou"];

// ---- args ----
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const qualityArg = (args.find((a) => a.startsWith("--quality=")) || "--quality=medium").split("=")[1];
const model = (args.find((a) => a.startsWith("--model=")) || "").split("=")[1]
  || process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
let ids;
if (args.includes("--pilot")) {
  ids = PILOT;
} else {
  const list = args.find((a) => !a.startsWith("--"));
  ids = list ? list.split(",").map((s) => s.trim()) : Object.keys(PROMPTS).filter((k) => k !== "_style");
}

// route through the sandbox proxy if one is configured (harmless elsewhere)
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
if (proxy && !dryRun) {
  try {
    const { ProxyAgent, setGlobalDispatcher } = await import("undici");
    setGlobalDispatcher(new ProxyAgent(proxy));
  } catch (e) { /* undici not available; global fetch still works without proxy */ }
}

fs.mkdirSync(OUT_DIR, { recursive: true });

async function genOne(id) {
  const spec = PROMPTS[id];
  if (!spec) { console.log(`skip ${id}: no prompt`); return "skip"; }
  const outPath = path.join(OUT_DIR, id + ".png");
  if (!force && fs.existsSync(outPath)) { console.log(`skip ${id}: already exists (use --force)`); return "skip"; }
  const prompt = STYLE + " " + spec;
  if (dryRun) { console.log(`\n[${id}]\n${prompt}`); return "dry"; }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.OPENAI_API_KEY
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1024",
      quality: qualityArg,
      background: "transparent",
      output_format: "png",
      n: 1
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${id}: HTTP ${res.status} ${t.slice(0, 300)}`);
  }
  const json = await res.json();
  const b64 = json.data && json.data[0] && json.data[0].b64_json;
  if (!b64) throw new Error(`${id}: no image in response`);
  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
  console.log(`ok   ${id} -> assets/enemies/${id}.png`);
  return "ok";
}

if (!dryRun && !process.env.OPENAI_API_KEY) {
  console.error("ERROR: set OPENAI_API_KEY (or use --dry-run to preview prompts).");
  process.exit(1);
}

console.log(`Generating ${ids.length} image(s) [model=${model} quality=${qualityArg}${dryRun ? ", DRY-RUN" : ""}]`);
let ok = 0, fail = 0;
for (const id of ids) {
  try {
    const r = await genOne(id);
    if (r === "ok") ok++;
  } catch (e) {
    fail++;
    console.error("FAIL " + e.message);
  }
}
console.log(`\nDone. ok=${ok} fail=${fail} of ${ids.length}`);
if (fail) process.exit(1);
