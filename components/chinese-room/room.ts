// The rule book of Figure 1: a small finite-state transducer. Its state is the
// page the book is open at; its input and output are strings of glyphs. The
// instructions are in English (as in Searle's story); only the glyphs are
// opaque. The English gloss below is used by the hallway, never by the book.

import { makeScript, type Glyph } from "./script";

export const TOKENS = [
  "HELLO",
  "AGAIN",
  "GOODBYE",
  "IS",
  "THE",
  "DOOR",
  "WINDOW",
  "LAMP",
  "SHUT",
  "YES",
  "WHERE",
  "HERE",
  "DO",
  "YOU",
  "UNDERSTAND",
  "ME",
  "I",
  "NOT",
] as const;
export type Tok = (typeof TOKENS)[number];

export const GLYPHS: Record<Tok, Glyph> = makeScript(TOKENS, 1980) as Record<Tok, Glyph>;

/** The order of the glyphs in the tray: fixed, and unrelated to the gloss. */
export const TRAY: Tok[] = [...TOKENS].sort((a, b) => GLYPHS[a].length - GLYPHS[b].length || (a < b ? 1 : -1));

export type Page = "I" | "II";
export type Pat = { tok: Tok } | { slot: number };
export type Out = { tok: Tok } | { copy: number };

export type Rule = {
  page: Page | null; // null: any page
  pattern: Pat[] | "any";
  reply: Out[];
  next: Page | null; // null: stay on this page
};

const t = (...toks: Tok[]) => toks.map((tok) => ({ tok }));

export const RULES: Rule[] = [
  { page: "I", pattern: t("HELLO"), reply: t("HELLO"), next: "II" },
  { page: "II", pattern: t("HELLO"), reply: t("HELLO", "AGAIN"), next: null },
  { page: "II", pattern: t("GOODBYE"), reply: t("GOODBYE"), next: "I" },
  { page: null, pattern: t("IS", "THE", "DOOR", "SHUT"), reply: t("YES"), next: null },
  {
    page: null,
    pattern: [...t("WHERE", "IS", "THE"), { slot: 1 }],
    reply: [{ tok: "THE" }, { copy: 1 }, ...t("IS", "HERE")],
    next: null,
  },
  { page: null, pattern: t("DO", "YOU", "UNDERSTAND", "ME"), reply: t("YES", "I", "UNDERSTAND", "YOU"), next: null },
  { page: null, pattern: "any", reply: t("I", "DO", "NOT", "UNDERSTAND"), next: null },
];

/** What the visitor in the hallway slides under the door, in order. */
export const VISITOR: Tok[][] = [
  ["HELLO"],
  ["IS", "THE", "DOOR", "SHUT"],
  ["WHERE", "IS", "THE", "LAMP"],
  ["DO", "YOU", "UNDERSTAND", "ME"],
  ["IS", "THE", "WINDOW", "SHUT"],
  ["HELLO"],
  ["GOODBYE"],
];

export type Fit =
  | { ok: true; looks: number; bind: Record<number, Tok> }
  | { ok: false; looks: number; why: "page" | "length" | number };

/**
 * Does one rule fit? `looks` counts the elementary checks a careful clerk makes
 * before deciding: the page, the length, then glyph by glyph until a mismatch.
 */
export function fits(rule: Rule, page: Page, slip: Tok[]): Fit {
  let looks = 0;
  if (rule.page) {
    looks++;
    if (rule.page !== page) return { ok: false, looks, why: "page" };
  }
  if (rule.pattern === "any") return { ok: true, looks, bind: {} };
  looks++;
  if (rule.pattern.length !== slip.length) return { ok: false, looks, why: "length" };
  const bind: Record<number, Tok> = {};
  for (let i = 0; i < slip.length; i++) {
    const p = rule.pattern[i];
    looks++;
    if ("slot" in p) bind[p.slot] = slip[i];
    else if (p.tok !== slip[i]) return { ok: false, looks, why: i };
  }
  return { ok: true, looks, bind };
}

/** The book's one instruction about itself: use the first rule that fits. */
export function firstFit(page: Page, slip: Tok[]) {
  let looks = 0;
  for (let r = 0; r < RULES.length; r++) {
    const f = fits(RULES[r], page, slip);
    looks += f.looks;
    if (f.ok) return { rule: r, looks, bind: f.bind };
  }
  throw new Error("the last rule always fits");
}

export function replyFor(rule: Rule, bind: Record<number, Tok>): Tok[] {
  return rule.reply.map((o) => ("tok" in o ? o.tok : bind[o.copy]));
}

/** Where in the slip a rule's slot sits (for highlighting the copy). */
export function slotPosition(rule: Rule, slot: number) {
  return rule.pattern === "any" ? -1 : rule.pattern.findIndex((p) => "slot" in p && p.slot === slot);
}

// ---------------------------------------------------------------------------
// The hallway's reading. Nothing above this line consults it.
// ---------------------------------------------------------------------------

export const GLOSS: Record<Tok, string> = {
  HELLO: "hello",
  AGAIN: "again",
  GOODBYE: "goodbye",
  IS: "is",
  THE: "the",
  DOOR: "door",
  WINDOW: "window",
  LAMP: "lamp",
  SHUT: "shut",
  YES: "yes",
  WHERE: "where",
  HERE: "here",
  DO: "do",
  YOU: "you",
  UNDERSTAND: "understand",
  ME: "me",
  I: "I",
  NOT: "not",
};

export function english(toks: Tok[]) {
  const words = toks.map((k) => GLOSS[k]);
  const s = words.join(" ");
  const q = ["IS", "WHERE", "DO"].includes(toks[0]);
  return s.charAt(0).toUpperCase() + s.slice(1) + (q ? "?" : ".");
}

/** Run the whole visit without a reader: the transcript and the work it took. */
export function runAll() {
  let page: Page = "I";
  const log: { slip: Tok[]; reply: Tok[]; rule: number; looks: number; copies: number; page: Page }[] = [];
  for (const slip of VISITOR) {
    const { rule, looks, bind } = firstFit(page, slip);
    const reply = replyFor(RULES[rule], bind);
    log.push({ slip, reply, rule, looks, copies: reply.length, page });
    page = RULES[rule].next ?? page;
  }
  return log;
}

/** Elementary operations for the whole visit: every check, every copied glyph, every page turn. */
export const VISIT_OPS = (() => {
  const log = runAll();
  return log.reduce((s, l) => s + l.looks + l.copies + (RULES[l.rule].next ? 1 : 0), 0);
})();
