#!/usr/bin/env node
// check.mjs — Truora brand validator. Pure Node, zero dependencies.
//
// Run it on anything you generate with this design system:
//
//   node scripts/check.mjs <file-or-dir> [...more]
//
// Scans .html/.css/.jsx/.js/.tsx/.ts files (recursing into directories,
// skipping node_modules/dist/dot-dirs and binaries) and enforces the brand's
// non-negotiable rules:
//
//   no-gradient      gradients are forbidden — depth comes from the Glass Effect
//   no-raw-brand-hex brand colors must be referenced via tokens (var(--cta), …)
//   no-circle-glass  glass panes are rectangles/squares only — never circles
//   no-offbrand-font only Host Grotesk + JetBrains Mono (via the font tokens)
//   no-glow-shadow   shadows are subtle and midnight-tinted — no colored glows
//
// Exit 0 = clean. Exit 1 = violations, each reported as file:line, the rule,
// the offending text, and a fix hint.
//
// This file is also a module: scripts/check-brand.mjs (repo gate) imports the
// scanner so there is exactly ONE implementation of these rules.

import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

// ── Rule data ────────────────────────────────────────────────────────────────

export const GRADIENT_RE = /\b(?:repeating-)?(?:linear|radial|conic)-gradient\s*\(/i;

// Brand palette hex → the token to use instead. Raw usage outside token files
// is a violation; the token keeps the 40/30/15/10/5 hierarchy maintainable.
export const BRAND_HEX = [
  { hex: '#3C1AEA', name: 'Azul violeta', token: 'var(--brand)' },
  { hex: '#EE792F', name: 'Naranja (CTA)', token: 'var(--cta)' },
  { hex: '#01022E', name: 'Azul medianoche', token: 'var(--midnight)' },
  { hex: '#FAFBFF', name: 'Blanco', token: 'var(--surface-page)' },
  { hex: '#9BD2F3', name: 'Azul claro', token: 'var(--lightblue-300)' },
  { hex: '#25D366', name: 'WhatsApp green', token: 'var(--whatsapp)' },
  { hex: '#5300FF', name: 'logo-artwork violet', token: 'var(--brand) — UI uses #3C1AEA via tokens' },
];

const DS_FONT_FAMILIES = ['Host Grotesk', 'JetBrains Mono'];
// Generic/system families that may appear as fallbacks without a violation.
const GENERIC_FAMILIES = new Set([
  'sans-serif', 'serif', 'monospace', 'system-ui', 'ui-monospace', 'ui-sans-serif',
  'ui-serif', 'cursive', 'fantasy', 'emoji', 'math', 'inherit', 'initial', 'unset',
]);

export const SCAN_EXT = new Set(['.html', '.css', '.jsx', '.js', '.tsx', '.ts']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'fonts']);

// ── Scanner ──────────────────────────────────────────────────────────────────

/**
 * True when the hex at `idx` sits inside a `--custom-prop: …` definition —
 * defining a token from a brand color is allowed; raw *usage* is not.
 */
function isCustomPropDef(line, idx) {
  const declStart = Math.max(line.lastIndexOf(';', idx), line.lastIndexOf('{', idx)) + 1;
  return /^\s*--[\w-]+\s*:/.test(line.slice(declStart, idx));
}

/** True when this file is a token source (raw brand hex is allowed there). */
function isTokenFile(relPath) {
  const p = relPath.split(path.sep).join('/');
  return /(^|\/)tokens\/[^/]+\.css$/.test(p);
}

function findFontViolation(line) {
  const m = line.match(/font-?[fF]amily\s*[:=]\s*(["'`]?)([^;}\n]+)/);
  if (!m) return null;
  const value = m[2].trim();
  if (value.startsWith('var(')) return null; // token reference — correct usage
  // First concrete family in the stack decides.
  const first = value
    .split(',')[0]
    .replace(/["'`]/g, '')
    .replace(/\$\{[^}]*\}/g, '')
    .trim();
  if (!first) return null;
  if (GENERIC_FAMILIES.has(first.toLowerCase())) return null;
  if (DS_FONT_FAMILIES.some((f) => first.toLowerCase() === f.toLowerCase())) return null;
  return first;
}

/**
 * Scan one file's text. Returns an array of violations:
 *   { rule, line (1-based), excerpt, hint }
 * `opts.rules` (Set/array) limits which rules run; default = all.
 */
export function checkText(text, relPath, opts = {}) {
  const enabled = opts.rules ? new Set(opts.rules) : null;
  const on = (rule) => !enabled || enabled.has(rule);
  const violations = [];
  const lines = text.split(/\r?\n/);
  const tokenFile = isTokenFile(relPath);

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const excerpt = line.trim().slice(0, 120);

    // 1. no-gradient
    if (on('no-gradient') && GRADIENT_RE.test(line)) {
      violations.push({
        rule: 'no-gradient',
        line: lineNo,
        excerpt,
        hint: 'gradients are forbidden — Truora uses solid colors; build depth with the Glass Effect (.tru-glass / GlassCard)',
      });
    }

    // 2. no-raw-brand-hex (token files and --custom-prop definitions are exempt)
    if (on('no-raw-brand-hex') && !tokenFile) {
      for (const { hex, name, token } of BRAND_HEX) {
        const re = new RegExp(`${hex}(?![0-9a-fA-F])`, 'gi');
        let m;
        while ((m = re.exec(line)) !== null) {
          if (isCustomPropDef(line, m.index)) continue;
          violations.push({
            rule: 'no-raw-brand-hex',
            line: lineNo,
            excerpt,
            hint: `use ${token}, not raw ${hex} (${name}) — tokens keep the 40/30/15/10/5 hierarchy maintainable`,
          });
          break; // one report per hex per line
        }
      }
    }

    // 4. no-offbrand-font
    if (on('no-offbrand-font')) {
      const fam = findFontViolation(line);
      if (fam) {
        violations.push({
          rule: 'no-offbrand-font',
          line: lineNo,
          excerpt,
          hint: `'${fam}' is not a Truora typeface — use Host Grotesk via var(--font-sans)/var(--font-display) or JetBrains Mono via var(--font-mono)`,
        });
      }
    }

    // 5. no-glow-shadow
    if (on('no-glow-shadow') && /box-?[sS]hadow\s*[:=]/.test(line)) {
      const value = line.slice(line.search(/box-?[sS]hadow/));
      const colored =
        BRAND_HEX.some(({ hex }) => new RegExp(`${hex}(?![0-9a-fA-F])`, 'i').test(value)) ||
        /var\(--(?:cta|brand|orange|violet|whatsapp|lightblue|danger|success)[\w-]*\)/.test(value);
      const glow = /[:,]\s*(?:inset\s+)?0(?:px)?\s+0(?:px)?\s+\d+/.test(value) &&
        !/rgba?\(\s*255\s*,\s*255\s*,\s*255/.test(value);
      if (colored || glow) {
        violations.push({
          rule: 'no-glow-shadow',
          line: lineNo,
          excerpt,
          hint: 'shadows are subtle, cool, midnight-tinted (use var(--shadow-sm/md/lg)) — no colored glows; buttons are flat solid color',
        });
      }
    }
  });

  // 3. no-circle-glass — block-aware: a fully-rounded radius is only a
  // violation when the same declaration block is a glass pane.
  if (on('no-circle-glass')) {
    let blockStartLine = 1;
    let lineCursor = 1;
    for (const segment of text.split('}')) {
      const segLines = segment.split(/\r?\n/);
      const isGlass = /backdrop-?[fF]ilter|--glass-fill|tru-glass|GlassCard/.test(segment);
      if (isGlass) {
        const radius = segment.match(/border-?[rR]adius\s*[:=]\s*["'`]?\s*(\d+(?:\.\d+)?)(%|px)/);
        if (radius) {
          const [, num, unit] = radius;
          const circular = (unit === '%' && Number(num) >= 50) || (unit === 'px' && Number(num) >= 500);
          if (circular) {
            const radiusLineInSeg = segLines.findIndex((l) => /border-?[rR]adius/.test(l));
            violations.push({
              rule: 'no-circle-glass',
              line: blockStartLine + Math.max(radiusLineInSeg, 0),
              excerpt: segLines[Math.max(radiusLineInSeg, 0)].trim().slice(0, 120),
              hint: 'the Glass Effect is rectangles/squares ONLY — never circles or full pills; use var(--glass-radius) (20px)',
            });
          }
        }
      }
      lineCursor += segLines.length - 1;
      blockStartLine = lineCursor;
    }
  }

  return violations.sort((a, b) => a.line - b.line);
}

/** Recursively collect scannable files from a path (file or directory). */
export function collectFiles(target, out = []) {
  const st = fs.statSync(target);
  if (st.isDirectory()) {
    for (const name of fs.readdirSync(target)) {
      if (name.startsWith('.') || SKIP_DIRS.has(name)) continue;
      collectFiles(path.join(target, name), out);
    }
  } else if (SCAN_EXT.has(path.extname(target))) {
    out.push(target);
  }
  return out;
}

/**
 * Check a list of root paths. Returns { files, violations } where each
 * violation also carries its file path. `opts` forwards to checkText.
 */
export function runCheck(targets, opts = {}) {
  const selfPath = fs.realpathSync(fileURLToPath(import.meta.url));
  const files = [];
  for (const t of targets) files.push(...collectFiles(path.resolve(t)));
  const violations = [];
  for (const file of files) {
    if (fs.realpathSync(file) === selfPath) continue; // never scan the validator itself
    const rel = path.relative(process.cwd(), file) || file;
    for (const v of checkText(fs.readFileSync(file, 'utf8'), rel, opts)) {
      violations.push({ file: rel, ...v });
    }
  }
  return { files, violations };
}

// ── CLI ──────────────────────────────────────────────────────────────────────

function main() {
  const targets = process.argv.slice(2).filter((a) => !a.startsWith('-'));
  if (targets.length === 0) {
    console.error('usage: node check.mjs <file-or-dir> [...more]');
    console.error('Validates generated HTML/CSS/JSX against the Truora brand rules.');
    process.exit(2);
  }
  for (const t of targets) {
    if (!fs.existsSync(t)) {
      console.error(`check: path not found: ${t}`);
      process.exit(2);
    }
  }

  const { files, violations } = runCheck(targets);

  if (violations.length === 0) {
    console.log(`check: OK — ${files.length} file(s) clean. On-brand: solid colors, glass depth, Host Grotesk.`);
    process.exit(0);
  }

  for (const v of violations) {
    console.error(`✗ ${v.rule}  ${v.file}:${v.line}`);
    console.error(`    ${v.excerpt}`);
    console.error(`    fix: ${v.hint}`);
  }
  console.error(`\ncheck: ${violations.length} violation(s) in ${files.length} file(s). Fix and rerun until clean.`);
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
