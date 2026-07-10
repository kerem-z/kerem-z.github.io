import { blogCards, site } from "../lib/site";
import { toRfc822 } from "../lib/dates";
import { writeFileSync } from "fs";
import { join } from "path";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const items = [...blogCards].sort((a, b) => b.date.localeCompare(a.date));
const lastBuild = toRfc822(items[0]?.date ?? "2026-07-09");

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(site.name)}</title>
    <link>${site.url}/</link>
    <description>${escapeXml(site.description)}</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${site.url}/rss.xml" rel="self" type="application/rss+xml" />
${items
  .map((post) => {
    const link = `${site.url}${post.href}`;
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${toRfc822(post.date)}</pubDate>
      <description>${escapeXml(post.description)}</description>
    </item>`;
  })
  .join("\n")}
  </channel>
</rss>
`;

const out = join(process.cwd(), "public", "rss.xml");
writeFileSync(out, xml, "utf8");
console.log(`Wrote ${out}`);
