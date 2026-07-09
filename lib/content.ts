import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

export type ContentKind = "blog" | "courses" | "notes";

export type ContentMeta = {
  slug: string;
  title: string;
  description: string;
  date: string;
  categories: string[];
  status: "published" | "forthcoming";
  readingTime: string;
  kind: ContentKind;
};

export type ContentItem = ContentMeta & {
  content: string;
};

const root = path.join(process.cwd(), "content");

function readDir(kind: ContentKind): ContentItem[] {
  const dir = path.join(root, kind);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mdx") || f.endsWith(".md"))
    .map((file) => {
      const slug = file.replace(/\.mdx?$/, "");
      const raw = fs.readFileSync(path.join(dir, file), "utf8");
      const { data, content } = matter(raw);
      const stats = readingTime(content);

      return {
        slug,
        title: String(data.title ?? slug),
        description: String(data.description ?? ""),
        date: String(data.date ?? "1970-01-01"),
        categories: Array.isArray(data.categories)
          ? data.categories.map(String)
          : [],
        status: data.status === "forthcoming" ? "forthcoming" : "published",
        readingTime: stats.text,
        kind,
        content,
      } satisfies ContentItem;
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllContent(kind: ContentKind): ContentMeta[] {
  return readDir(kind).map(({ content, ...meta }) => {
    void content;
    return meta;
  });
}

export function getContentBySlug(
  kind: ContentKind,
  slug: string,
): ContentItem | null {
  return readDir(kind).find((item) => item.slug === slug) ?? null;
}

export function getAllSlugs(kind: ContentKind): string[] {
  return readDir(kind).map((item) => item.slug);
}
