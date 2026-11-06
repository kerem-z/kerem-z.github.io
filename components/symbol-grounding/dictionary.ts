// A small closed dictionary and the graph computations the post runs on it.
//
// Every content word in a definition is itself an entry, marked [word] or
// [word|shown form]. Unmarked words (a, the, of, can, ...) are glue: they are
// left out of the graph, a simplification the post states.

export const ENTRIES: Record<string, string> = {
  apple: "a [round] [fruit] that [grow|grows] on a [tree]",
  fruit: "the [sweet] [part] of a [plant] that [hold|holds] its [seed|seeds]",
  food: "any [thing] a [living] [body] can [eat], such as [fruit]",
  eat: "to [take] [food] in through the [mouth] and [taste] it",
  mouth: "the [part] of the [body] you [eat] with",
  sweet: "the [taste] that [fruit] has",
  taste: "what the [tongue] [feel|feels] in [food]",
  tongue: "the [part] of the [mouth] that can [taste]",
  feel: "to [know] a [thing] through the [body]",
  know: "to [see] or [feel] that a [thing] is so",
  see: "to [know] a [thing] by the [eye]",
  eye: "the [part] of the [body] that can [see] [light]",
  light: "what the [eye] needs in order to [see]",
  plant: "a [living] [thing] that [grow|grows] in the [ground]",
  tree: "a [big] [plant] of [wood]",
  wood: "the [hard] [part] of a [tree]",
  seed: "a [small] [part] of a [plant] that can [grow] into a [new] [plant]",
  grow: "to get [big|bigger], as a [plant] or other [living] [thing] does",
  living: "able to [grow], to [eat] and to [feel]",
  thing: "any [part] of the [world]",
  part: "a [thing] inside a [big|bigger] [thing]",
  world: "the [big|biggest] [thing], which [hold|holds] all [thing|things]",
  body: "the [whole] of a [living] [thing]",
  whole: "every [part] of a [thing]",
  big: "more than [small]",
  small: "less than [big]",
  hard: "how [wood] or [ground] [feel|feels]",
  ground: "the [hard] [part] of the [world] under you",
  round: "having the [shape] of an [apple]",
  shape: "what the [eye] can [see] and the [body] can [feel] of a [thing]",
  new: "not long [grow|grown]",
  hold: "to have a [thing] inside a [part] of your [body]",
  take: "to get a [thing] and [hold] it",
  pie: "a [sweet] [food] with [fruit] inside",
  orchard: "[ground] where many [apple] [tree|trees] [grow]",
  juice: "what you [taste] when you [eat] a [fruit]",
  harvest: "to [take] [fruit] and [seed|seeds] from a [plant]",
  cider: "the [juice] of [apple|apples]",
};

export const WORDS = Object.keys(ENTRIES);

export type Segment = { text: string; word?: string };

/** A definition as text segments, with linked words marked. */
export function segments(word: string): Segment[] {
  const out: Segment[] = [];
  const re = /\[([a-z]+)(?:\|([^\]]+))?\]/g;
  const def = ENTRIES[word];
  let last = 0;
  for (let m = re.exec(def); m; m = re.exec(def)) {
    if (m.index > last) out.push({ text: def.slice(last, m.index) });
    out.push({ text: m[2] ?? m[1], word: m[1] });
    last = m.index + m[0].length;
  }
  if (last < def.length) out.push({ text: def.slice(last) });
  return out;
}

/** The distinct entries a word's definition uses. */
export const DEPS: Record<string, string[]> = Object.fromEntries(
  WORDS.map((w) => [w, [...new Set(segments(w).flatMap((s) => (s.word ? [s.word] : [])))]]),
);

/** For each word, the words whose definitions use it. */
export const USERS: Record<string, string[]> = Object.fromEntries(
  WORDS.map((w) => [w, WORDS.filter((v) => DEPS[v].includes(w))]),
);

/**
 * What can be learned from definitions alone, starting from the grounded set G.
 * Round 0 is G; a word joins in round t+1 once every word in its definition is
 * known by round t. Words that never join are absent from the map.
 */
export function closure(G: Iterable<string>): Map<string, number> {
  const known = new Map<string, number>();
  for (const g of G) known.set(g, 0);
  for (let round = 1; ; round++) {
    const fresh = WORDS.filter((w) => !known.has(w) && DEPS[w].every((d) => known.has(d)));
    if (!fresh.length) return known;
    for (const w of fresh) known.set(w, round);
  }
}

/**
 * Why a word is out of reach: follow, from it, the first unknown word in each
 * definition. Every unknown word has one (otherwise it would be learnable), so
 * the walk must come back on itself. Returns the loop it falls into.
 */
export function loopFrom(start: string, known: Map<string, number>): string[] {
  if (known.has(start)) return [];
  const path: string[] = [];
  const at = new Map<string, number>();
  let w = start;
  while (!at.has(w)) {
    at.set(w, path.length);
    path.push(w);
    const next = DEPS[w].find((d) => !known.has(d));
    if (!next) throw new Error(`${w} should have been learnable`);
    w = next;
  }
  return path.slice(at.get(w)!);
}

/** Repeatedly drop words that no remaining word's definition uses. */
export function kernel(): Set<string> {
  const K = new Set(WORDS);
  for (;;) {
    const drop = [...K].filter((w) => !USERS[w].some((u) => K.has(u)));
    if (!drop.length) return K;
    for (const w of drop) K.delete(w);
  }
}

/** Strongly connected components of the definition graph restricted to `within` (Tarjan). */
export function sccs(within: Set<string>): string[][] {
  let index = 0;
  const idx = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const on = new Set<string>();
  const out: string[][] = [];
  const visit = (v: string) => {
    idx.set(v, index);
    low.set(v, index);
    index++;
    stack.push(v);
    on.add(v);
    for (const w of DEPS[v]) {
      if (!within.has(w)) continue;
      if (!idx.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, idx.get(w)!));
    }
    if (low.get(v) === idx.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        on.delete(w);
        comp.push(w);
      } while (w !== v);
      out.push(comp);
    }
  };
  for (const v of WORDS) if (within.has(v) && !idx.has(v)) visit(v);
  return out.sort((a, b) => b.length - a.length);
}

/** A shortest loop among the words not yet known (breadth-first from each). */
function shortestLoop(known: Map<string, number>): string[] {
  let best: string[] | null = null;
  for (const s of WORDS) {
    if (known.has(s)) continue;
    const prev = new Map<string, string>();
    const queue = [s];
    let last: string | null = null;
    while (queue.length && last === null) {
      const v = queue.shift()!;
      for (const w of DEPS[v]) {
        if (known.has(w)) continue;
        if (w === s) {
          last = v;
          break;
        }
        if (!prev.has(w)) {
          prev.set(w, v);
          queue.push(w);
        }
      }
    }
    if (last === null) continue;
    const loop = [s];
    for (let v = last; v !== s; v = prev.get(v)!) loop.push(v);
    if (!best || loop.length < best.length) best = loop;
  }
  return best ?? [];
}

/**
 * Every smallest grounding set, by a bounded search tree: while something is
 * out of reach there is a loop of unknown words, and any grounding set must
 * contain one of that loop's words, so branch on a shortest one. Iterative
 * deepening finds the smallest size; the same search with that budget lists
 * every set of that size. Exact, and quick for a graph this small; the
 * underlying problem (minimum feedback vertex set) is NP-hard in general.
 */
export function minimumSets() {
  const found = new Set<string>();
  const seen = new Set<string>();
  const search = (G: string[], budget: number, collect: boolean): boolean => {
    const key = [...G].sort().join(",");
    if (seen.has(key)) return false;
    seen.add(key);
    const known = closure(G);
    if (known.size === WORDS.length) {
      found.add(key);
      return true;
    }
    if (budget === 0) return false;
    let any = false;
    for (const v of shortestLoop(known)) {
      if (search([...G, v], budget - 1, collect)) {
        any = true;
        if (!collect) return true;
      }
    }
    return any;
  };
  let size = 0;
  for (; ; size++) {
    seen.clear();
    if (search([], size, false)) break;
  }
  seen.clear();
  found.clear();
  search([], size, true);
  const sets = [...found].map((k) => k.split(",")).filter((g) => g.length === size);
  return { size, count: sets.length, nth: (i: number) => sets[i % sets.length] };
}

/** Glue words that appear in definitions, so the invented script can write them too. */
export const GLUE: string[] = [
  ...new Set(
    WORDS.flatMap((w) =>
      segments(w)
        .filter((s) => !s.word)
        .flatMap((s) => s.text.toLowerCase().match(/[a-z]+/g) ?? []),
    ),
  ),
].filter((g) => !WORDS.includes(g));
