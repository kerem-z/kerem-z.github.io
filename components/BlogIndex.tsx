"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatDate } from "@/lib/dates";
import {
  blogCards,
  categoryTree,
  subcategoryTree,
  type BlogCard,
} from "@/lib/site";
import styles from "./BlogIndex.module.css";

type SortMode = "date-desc" | "date-asc";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function monthKey(date: string) {
  const [y, m] = date.split("-");
  return `${y}-${m}`;
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${MONTHS_SHORT[Number(m) - 1]} ${y}`;
}

function uniqueCategories(posts: BlogCard[]) {
  return Array.from(new Set(posts.flatMap((p) => p.categories))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function uniqueMonths(posts: BlogCard[]) {
  return Array.from(new Set(posts.map((p) => monthKey(p.date)))).sort((a, b) =>
    b.localeCompare(a),
  );
}

function BranchCurves({
  count,
  startY,
  rowH,
  width,
  height,
  activeIndex,
  markerId,
}: {
  count: number;
  startY: number;
  rowH: number;
  width: number;
  height: number;
  activeIndex?: number | null;
  markerId: string;
}) {
  return (
    <svg
      className={styles.branchSvg}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="4.5"
          markerHeight="4.5"
          markerUnits="userSpaceOnUse"
          orient="auto-start-reverse"
        >
          <path d="M 1 1.5 L 9 5 L 1 8.5 z" fill="currentColor" />
        </marker>
      </defs>
      {Array.from({ length: count }, (_, i) => {
        const endY = 14 + i * rowH;
        const d = `M 4 ${startY} C ${width * 0.35} ${startY}, ${width * 0.55} ${endY}, ${width - 8} ${endY}`;
        return (
          <path
            key={i}
            d={d}
            pathLength={1}
            className={styles.curve}
            data-active={activeIndex === i}
            style={{ animationDelay: `${40 + i * 55}ms` }}
            markerEnd={`url(#${markerId})`}
          />
        );
      })}
      <circle cx="4" cy={startY} r="2.25" className={styles.hubDot} />
    </svg>
  );
}

export function BlogIndex() {
  const categories = useMemo(() => uniqueCategories(blogCards), []);
  const months = useMemo(() => uniqueMonths(blogCards), []);
  const [category, setCategory] = useState<string | null>(null);
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [leaf, setLeaf] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [sort, setSort] = useState<SortMode>("date-desc");
  const [open, setOpen] = useState(false);
  const [hoverParent, setHoverParent] = useState<string | null>(null);
  const [hoverSub, setHoverSub] = useState<string | null>(null);

  const activeParent = hoverParent ?? category;
  const activeParentIndex = activeParent
    ? categories.indexOf(activeParent)
    : -1;
  const subs = activeParent ? (categoryTree[activeParent] ?? []) : [];
  const activeSub = hoverSub ?? subcategory;
  const activeSubIndex = activeSub ? subs.indexOf(activeSub) : -1;
  const leaves = activeSub ? (subcategoryTree[activeSub] ?? []) : [];
  const show = open || category !== null;

  const posts = useMemo(() => {
    let filtered = blogCards;
    if (category) {
      filtered = filtered.filter((p) => p.categories.includes(category));
    }
    if (leaf) {
      filtered = filtered.filter((p) => (p.subcategories ?? []).includes(leaf));
    } else if (subcategory) {
      filtered = filtered.filter((p) =>
        (p.subcategories ?? []).includes(subcategory),
      );
    }
    if (month) {
      filtered = filtered.filter((p) => monthKey(p.date) === month);
    }
    return [...filtered].sort((a, b) =>
      sort === "date-asc"
        ? a.date.localeCompare(b.date)
        : b.date.localeCompare(a.date),
    );
  }, [category, subcategory, leaf, month, sort]);

  const rowH = 38;
  const subRowH = 34;
  const parentH = Math.max(48, 8 + categories.length * rowH);
  const subH = Math.max(parentH, 8 + Math.max(subs.length, 1) * subRowH);
  const leafH = Math.max(subH, 8 + Math.max(leaves.length, 1) * subRowH);
  const parentStartY = 14;
  const subStartY =
    activeParentIndex >= 0 ? 14 + activeParentIndex * rowH : 14;
  const leafStartY =
    activeSubIndex >= 0 ? 14 + activeSubIndex * subRowH : 14;

  function clearFilter() {
    setCategory(null);
    setSubcategory(null);
    setLeaf(null);
    setMonth(null);
    setHoverParent(null);
    setHoverSub(null);
    setOpen(false);
  }

  function pickParent(cat: string) {
    setCategory(cat);
    setSubcategory(null);
    setLeaf(null);
    setHoverParent(cat);
    setHoverSub(null);
    setOpen(true);
  }

  function pickSub(sub: string) {
    if (!activeParent) return;
    setCategory(activeParent);
    setSubcategory((prev) => (prev === sub && !leaf ? null : sub));
    setLeaf(null);
    setHoverSub(sub);
    setOpen(true);
  }

  function pickLeaf(item: string) {
    if (!activeParent || !activeSub) return;
    setCategory(activeParent);
    setSubcategory(activeSub);
    setLeaf((prev) => (prev === item ? null : item));
    setOpen(true);
  }

  return (
    <main className={`${styles.main} fade-up`}>
      <header className={styles.header}>
        <h1 className="sr-only">Blog</h1>
        <div className={styles.sort} role="group" aria-label="Sort by date">
          <button
            type="button"
            className={styles.sortBtn}
            data-active={sort === "date-desc"}
            onClick={() => setSort("date-desc")}
          >
            Newest
          </button>
          <span className={styles.sortSep} aria-hidden>
            /
          </span>
          <button
            type="button"
            className={styles.sortBtn}
            data-active={sort === "date-asc"}
            onClick={() => setSort("date-asc")}
          >
            Oldest
          </button>
        </div>
        <div className={styles.months} role="group" aria-label="Filter by month">
          {months.map((m, i) => (
            <span key={m} className={styles.monthItem}>
              {i > 0 && (
                <span className={styles.monthSep} aria-hidden>
                  ·
                </span>
              )}
              <button
                type="button"
                className={styles.monthBtn}
                data-active={month === m}
                onClick={() => setMonth((prev) => (prev === m ? null : m))}
              >
                {monthLabel(m)}
              </button>
            </span>
          ))}
        </div>
      </header>

      <section
        className={styles.map}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!category) {
            setOpen(false);
            setHoverParent(null);
            setHoverSub(null);
          }
        }}
      >
        <div className={styles.mapHub}>
          <button
            type="button"
            className={styles.hub}
            data-active={!category}
            onClick={clearFilter}
            onFocus={() => setOpen(true)}
          >
            Topics
          </button>
          {!show && <span className={styles.hint}>hover to explore</span>}
          {(category || subcategory || leaf) && (
            <span className={styles.trail}>
              {[category, subcategory, leaf].filter(Boolean).join(" / ")}
              <button
                type="button"
                className={styles.trailClear}
                onClick={clearFilter}
              >
                reset
              </button>
            </span>
          )}
        </div>

        {show && (
          <div className={styles.mapFlow}>
            <div className={styles.flowCol} style={{ minHeight: parentH }}>
              <BranchCurves
                count={categories.length}
                startY={parentStartY}
                rowH={rowH}
                width={120}
                height={parentH}
                activeIndex={activeParentIndex >= 0 ? activeParentIndex : null}
                markerId="arrow-parents"
              />
              <ul className={styles.nodeList}>
                {categories.map((cat, i) => (
                  <li
                    key={cat}
                    className={styles.nodeItem}
                    style={{
                      height: rowH,
                      animationDelay: `${70 + i * 50}ms`,
                    }}
                    onMouseEnter={() => {
                      setHoverParent(cat);
                      setHoverSub(null);
                    }}
                  >
                    <button
                      type="button"
                      className={styles.node}
                      data-active={category === cat}
                      data-hot={activeParent === cat}
                      onClick={() => pickParent(cat)}
                    >
                      {cat}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {subs.length > 0 && activeParent ? (
              <div
                className={styles.flowCol}
                style={{ minHeight: subH }}
                key={activeParent}
              >
                <BranchCurves
                  count={subs.length}
                  startY={subStartY}
                  rowH={subRowH}
                  width={130}
                  height={subH}
                  activeIndex={activeSubIndex >= 0 ? activeSubIndex : null}
                  markerId="arrow-subs"
                />
                <ul className={styles.nodeList}>
                  {subs.map((sub, i) => (
                    <li
                      key={sub}
                      className={styles.nodeItem}
                      style={{
                        height: subRowH,
                        animationDelay: `${60 + i * 55}ms`,
                      }}
                      onMouseEnter={() => setHoverSub(sub)}
                    >
                      <button
                        type="button"
                        className={styles.node}
                        data-active={subcategory === sub}
                        data-hot={activeSub === sub}
                        onClick={() => pickSub(sub)}
                      >
                        {sub}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {leaves.length > 0 && activeSub ? (
              <div
                className={styles.flowCol}
                style={{ minHeight: leafH }}
                key={`leaf-${activeSub}`}
              >
                <BranchCurves
                  count={leaves.length}
                  startY={leafStartY}
                  rowH={subRowH}
                  width={120}
                  height={leafH}
                  activeIndex={leaf ? leaves.indexOf(leaf) : null}
                  markerId="arrow-leaves"
                />
                <ul className={styles.nodeList}>
                  {leaves.map((item, i) => (
                    <li
                      key={item}
                      className={styles.nodeItem}
                      style={{
                        height: subRowH,
                        animationDelay: `${60 + i * 55}ms`,
                      }}
                    >
                      <button
                        type="button"
                        className={styles.node}
                        data-active={leaf === item}
                        onClick={() => pickLeaf(item)}
                      >
                        {item}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </section>

      <ul className={styles.list}>
        {posts.map((post) => (
          <li key={post.slug} className={styles.item}>
            <Link href={post.href} className={styles.card}>
              <span className={styles.media}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={post.image} alt="" />
              </span>
              <span className={styles.body}>
                <span className={styles.meta}>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <span className={styles.dot} aria-hidden>
                    ·
                  </span>
                  <span className={styles.cats}>
                    {[
                      ...post.categories,
                      ...(post.subcategories ?? []),
                    ].join(" · ")}
                  </span>
                  {post.status === "forthcoming" ? (
                    <>
                      <span className={styles.dot} aria-hidden>
                        ·
                      </span>
                      <span className={styles.badge}>Forthcoming</span>
                    </>
                  ) : null}
                </span>
                <span className={styles.postTitle}>{post.title}</span>
                <span className={styles.desc}>{post.description}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {posts.length === 0 ? (
        <p className={styles.empty}>Nothing in this topic yet.</p>
      ) : null}
    </main>
  );
}
