import fs from "fs";
import path from "path";

export type BibEntry = {
  key: string;
  type: string;
  fields: Record<string, string>;
};

function stripBraces(value: string) {
  return value
    .trim()
    .replace(/^\{|\}$/g, "")
    .replace(/^"|"$/g, "")
    .replace(/\\&/g, "&")
    .replace(/``/g, "\u201c")
    .replace(/''/g, "\u201d")
    .replace(/\s+/g, " ")
    .trim();
}

/** Minimal BibTeX parser for @type{key, field = {value}, ...} entries. */
export function parseBib(source: string): BibEntry[] {
  const entries: BibEntry[] = [];
  const entryRe = /@(\w+)\s*\{\s*([^,]+)\s*,([\s\S]*?)\n\s*\}/g;
  let match: RegExpExecArray | null;

  while ((match = entryRe.exec(source))) {
    const type = match[1].toLowerCase();
    const key = match[2].trim();
    const body = match[3];
    const fields: Record<string, string> = {};
    const fieldRe = /(\w+)\s*=\s*(\{[^{}]*\}|"[^"]*"|[^,]+)/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRe.exec(body))) {
      fields[fieldMatch[1].toLowerCase()] = stripBraces(fieldMatch[2]);
    }

    entries.push({ key, type, fields });
  }

  return entries;
}

export function loadBibFile(relativePath: string): BibEntry[] {
  const full = path.join(process.cwd(), relativePath);
  const raw = fs.readFileSync(full, "utf8");
  return parseBib(raw);
}

function formatAuthors(author: string | undefined) {
  if (!author) return "Unknown";
  const people = author.split(/\s+and\s+/i).map((a) => a.trim());
  const short = people.map((person) => {
    if (person.includes(",")) {
      const [last, rest] = person.split(",").map((s) => s.trim());
      const initials = (rest ?? "")
        .split(/\s+/)
        .filter(Boolean)
        .map((n) => `${n[0]}.`)
        .join(" ");
      return initials ? `${last}, ${initials}` : last;
    }
    const parts = person.split(/\s+/);
    const last = parts[parts.length - 1];
    const initials = parts
      .slice(0, -1)
      .map((n) => `${n[0]}.`)
      .join(" ");
    return initials ? `${last}, ${initials}` : last;
  });

  if (short.length === 1) return short[0];
  if (short.length === 2) return `${short[0]} and ${short[1]}`;
  return `${short.slice(0, -1).join(", ")}, and ${short[short.length - 1]}`;
}

export function formatBibEntry(entry: BibEntry): string {
  const f = entry.fields;
  const authors = formatAuthors(f.author);
  const year = f.year ?? "n.d.";
  const title = f.title ?? "Untitled";

  if (entry.type === "book") {
    const edition = f.edition ? `, ${f.edition} ed` : "";
    const publisher = f.publisher ? `. ${f.publisher}` : "";
    return `${authors} (${year}). ${title}${edition}${publisher}.`;
  }

  if (entry.type === "inproceedings") {
    const booktitle = f.booktitle ? ` In ${f.booktitle}` : "";
    const pages = f.pages ? ` (pp. ${f.pages.replace(/--/g, "-")})` : "";
    return `${authors} (${year}). ${title}.${booktitle}${pages}.`;
  }

  const journal = f.journal ? ` ${f.journal}` : "";
  const volume = f.volume ? `, ${f.volume}` : "";
  const pages = f.pages ? `, ${f.pages.replace(/--/g, "-")}` : "";
  return `${authors} (${year}). ${title}.${journal}${volume}${pages}.`;
}

export function indexBib(entries: BibEntry[], order: string[]) {
  const byKey = new Map(entries.map((e) => [e.key, e]));
  return order
    .map((key, i) => {
      const entry = byKey.get(key);
      if (!entry) return null;
      return { n: i + 1, key, entry, text: formatBibEntry(entry) };
    })
    .filter(Boolean) as { n: number; key: string; entry: BibEntry; text: string }[];
}
