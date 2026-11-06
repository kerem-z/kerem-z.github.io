"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import styles from "./chinese-room.module.css";
import {
  english,
  firstFit,
  fits,
  GLOSS,
  GLYPHS,
  replyFor,
  RULES,
  slotPosition,
  TRAY,
  VISITOR,
  type Page,
  type Tok,
} from "./room";
import { Glyph, useReducedMotion } from "./ui";

type Stage = "match" | "write" | "send" | "done";
type Note = { text: string; rule?: number; pos?: number };
type Line = { who: "visitor" | "room"; toks: Tok[] };

type S = {
  turn: number;
  page: Page;
  stage: Stage;
  rule: number | null;
  bind: Record<number, Tok>;
  written: Tok[];
  looks: number;
  copies: number;
  turns: number;
  lines: Line[];
  note: Note | null;
};

type A = { type: "pick"; r: number } | { type: "write"; tok: Tok } | { type: "send" } | { type: "auto" } | { type: "reset" };

const ORD = ["1st", "2nd", "3rd", "4th", "5th"];

const initial = (): S => ({
  turn: 0,
  page: "I",
  stage: "match",
  rule: null,
  bind: {},
  written: [],
  looks: 0,
  copies: 0,
  turns: 0,
  lines: [{ who: "visitor", toks: VISITOR[0] }],
  note: null,
});

function reduce(s: S, a: A): S {
  const slip = VISITOR[s.turn];
  switch (a.type) {
    case "reset":
      return initial();
    case "pick": {
      if (s.stage !== "match") return s;
      const rule = RULES[a.r];
      const f = fits(rule, s.page, slip);
      if (!f.ok) {
        const text =
          f.why === "page"
            ? `Rule ${a.r + 1} is for page ${rule.page}. The book is open at page ${s.page}.`
            : f.why === "length"
              ? `Rule ${a.r + 1} wants ${rule.pattern === "any" ? "any" : rule.pattern.length} shape${
                  rule.pattern !== "any" && rule.pattern.length === 1 ? "" : "s"
                }; this slip has ${slip.length}.`
              : `Rule ${a.r + 1} does not fit: the ${ORD[f.why]} shape is different.`;
        return { ...s, note: { text, rule: a.r, pos: typeof f.why === "number" ? f.why : undefined } };
      }
      const first = firstFit(s.page, slip);
      if (first.rule !== a.r)
        return {
          ...s,
          note: {
            text: `Rule ${a.r + 1} fits, but so does rule ${first.rule + 1}, which comes first. The book says: use the first rule that fits.`,
            rule: a.r,
          },
        };
      return { ...s, stage: "write", rule: a.r, bind: first.bind, looks: s.looks + first.looks, note: null };
    }
    case "write": {
      if (s.stage !== "write" || s.rule === null) return s;
      const want = replyFor(RULES[s.rule], s.bind);
      if (a.tok !== want[s.written.length])
        return { ...s, note: { text: "That is not the shape the rule asks for next." } };
      const written = [...s.written, a.tok];
      return {
        ...s,
        written,
        copies: s.copies + 1,
        stage: written.length === want.length ? "send" : "write",
        note: null,
      };
    }
    case "send": {
      if (s.stage !== "send" || s.rule === null) return s;
      const next = RULES[s.rule].next;
      const turn = s.turn + 1;
      const lines: Line[] = [...s.lines, { who: "room", toks: s.written }];
      const more = turn < VISITOR.length;
      if (more) lines.push({ who: "visitor", toks: VISITOR[turn] });
      return {
        ...s,
        turn,
        page: next ?? s.page,
        turns: s.turns + (next ? 1 : 0),
        stage: more ? "match" : "done",
        rule: null,
        bind: {},
        written: [],
        lines,
        note: null,
      };
    }
    case "auto": {
      if (s.stage === "match") return reduce(s, { type: "pick", r: firstFit(s.page, slip).rule });
      if (s.stage === "write" && s.rule !== null) {
        const want = replyFor(RULES[s.rule], s.bind);
        let t = s;
        for (let i = s.written.length; i < want.length; i++) t = reduce(t, { type: "write", tok: want[i] });
        return t;
      }
      if (s.stage === "send") return reduce(s, { type: "send" });
      return s;
    }
  }
}

function Cell({
  tok,
  size,
  gloss,
  mark,
}: {
  tok: Tok | null;
  size: number;
  gloss: boolean;
  mark?: "bad" | "source" | "slot";
}) {
  return (
    <span className={`${styles.cell} ${mark ? styles[mark] : ""}`}>
      {tok ? <Glyph g={GLYPHS[tok]} size={size} /> : <span style={{ width: size, height: size }} />}
      {gloss ? <span className={styles.gloss}>{tok ? GLOSS[tok] : " "}</span> : null}
    </span>
  );
}

function Slot({ n, size }: { n: number; size: number }) {
  return (
    <span className={styles.cell}>
      <span className={styles.slotMark} style={{ width: size, height: size }}>
        {n}
      </span>
    </span>
  );
}

export function RoomFigure() {
  const [s, dispatch] = useReducer(reduce, undefined, initial);
  const [gloss, setGloss] = useState(false);
  const [running, setRunning] = useState(false);
  const reduced = useReducedMotion();
  const outsideRef = useRef<HTMLOListElement>(null);

  // "Finish the visit": the book runs itself, one stage at a time.
  useEffect(() => {
    if (!running) return;
    if (s.stage === "done") {
      setRunning(false);
      return;
    }
    const id = window.setTimeout(() => dispatch({ type: "auto" }), reduced ? 0 : 320);
    return () => window.clearTimeout(id);
  }, [running, s, reduced]);

  useEffect(() => {
    const el = outsideRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.lines.length]);

  const slip = s.stage === "done" ? null : VISITOR[s.turn];
  const want = s.rule !== null ? replyFor(RULES[s.rule], s.bind) : [];
  const nextOut = s.rule !== null && s.stage === "write" ? RULES[s.rule].reply[s.written.length] : null;
  const sourcePos = nextOut && "copy" in nextOut && s.rule !== null ? slotPosition(RULES[s.rule], nextOut.copy) : -1;

  const instruction =
    s.stage === "match"
      ? "Find the first rule that fits this slip on this page, and click it."
      : s.stage === "write"
        ? "Write the reply the rule names, shape by shape, from the tray."
        : s.stage === "send"
          ? "The reply is written. Push it under the door."
          : "No more slips. The book is closed.";

  return (
    <figure className={styles.figure}>
      <div className={styles.roomGrid}>
        <section className={styles.inside} aria-label="Inside the room">
          <div className={styles.panelHead}>
            <span>Inside</span>
            <span className={styles.dim}>
              book open at page <b className={styles.pageMark}>{s.page}</b>
            </span>
          </div>

          <div className={styles.slipRow}>
            <span className={styles.label}>slip {Math.min(s.turn + 1, VISITOR.length)}/{VISITOR.length}</span>
            <div className={styles.slip} aria-live="polite">
              {slip
                ? slip.map((tok, i) => (
                    <Cell
                      key={`${s.turn}-${i}`}
                      tok={tok}
                      size={30}
                      gloss={gloss}
                      mark={s.note?.pos === i ? "bad" : sourcePos === i ? "source" : undefined}
                    />
                  ))
                : <span className={styles.dim}>(empty)</span>}
            </div>
          </div>

          <ol className={styles.book} aria-label="The rule book">
            {RULES.map((rule, r) => {
              const chosen = s.rule === r;
              const bad = s.note?.rule === r;
              return (
                <li key={r}>
                  <button
                    type="button"
                    className={`${styles.rule} ${chosen ? styles.ruleOn : ""} ${bad ? styles.ruleBad : ""}`}
                    disabled={s.stage !== "match" || running}
                    onClick={() => dispatch({ type: "pick", r })}
                  >
                    <span className={styles.ruleNo}>{r + 1}</span>
                    <span className={styles.rulePage}>{rule.page ? `p. ${rule.page}` : "any p."}</span>
                    <span className={styles.ruleCells}>
                      {rule.pattern === "any" ? (
                        <span className={styles.anything}>anything else</span>
                      ) : (
                        rule.pattern.map((p, i) =>
                          "tok" in p ? (
                            <Cell
                              key={i}
                              tok={p.tok}
                              size={18}
                              gloss={gloss}
                              mark={bad && s.note?.pos === i ? "bad" : undefined}
                            />
                          ) : (
                            <Slot key={i} n={p.slot} size={18} />
                          ),
                        )
                      )}
                    </span>
                    <span className={styles.arrow} aria-hidden>
                      →
                    </span>
                    <span className={styles.ruleCells}>
                      {rule.reply.map((o, i) =>
                        "tok" in o ? (
                          <Cell key={i} tok={o.tok} size={18} gloss={gloss} />
                        ) : (
                          <Slot key={i} n={o.copy} size={18} />
                        ),
                      )}
                    </span>
                    <span className={styles.turnTo}>{rule.next ? `turn to p. ${rule.next}` : ""}</span>
                  </button>
                </li>
              );
            })}
          </ol>

          <p className={styles.instruction}>{instruction}</p>
          <p className={styles.note} aria-live="polite">
            {s.note?.text ?? " "}
          </p>

          <div className={styles.replyRow}>
            <span className={styles.label}>reply</span>
            <div className={styles.slip}>
              {want.length
                ? want.map((_, i) => <Cell key={i} tok={s.written[i] ?? null} size={30} gloss={gloss} mark={i >= s.written.length ? "slot" : undefined} />)
                : <span className={styles.dim}>(nothing yet)</span>}
            </div>
            <button
              type="button"
              className={styles.btn}
              disabled={s.stage !== "send" || running}
              onClick={() => dispatch({ type: "send" })}
            >
              push under the door
            </button>
          </div>

          <div className={styles.tray} role="group" aria-label="Tray of shapes">
            {TRAY.map((tok, i) => (
              <button
                key={tok}
                type="button"
                className={styles.trayBtn}
                disabled={s.stage !== "write" || running}
                onClick={() => dispatch({ type: "write", tok })}
                aria-label={gloss ? `shape ${i + 1}, read outside as “${GLOSS[tok]}”` : `shape ${i + 1}`}
              >
                <Glyph g={GLYPHS[tok]} size={22} />
                {gloss ? <span className={styles.gloss}>{GLOSS[tok]}</span> : null}
              </button>
            ))}
          </div>

          <div className={styles.controls}>
            <button
              type="button"
              className={styles.btn}
              disabled={s.stage === "done" || running}
              onClick={() => dispatch({ type: "auto" })}
            >
              do this step for me
            </button>
            <button type="button" className={styles.btn} disabled={s.stage === "done" || running} onClick={() => setRunning(true)}>
              let the book run
            </button>
            <button
              type="button"
              className={styles.btn}
              onClick={() => {
                setRunning(false);
                dispatch({ type: "reset" });
              }}
            >
              start again
            </button>
            <label className={styles.toggle}>
              <input type="checkbox" checked={gloss} onChange={(e) => setGloss(e.target.checked)} /> show the hallway&apos;s
              reading
            </label>
          </div>
          <p className={styles.counter}>
            checks {s.looks} · shapes copied {s.copies} · pages turned {s.turns} ·{" "}
            <b>{s.looks + s.copies + s.turns}</b> operations
          </p>
        </section>

        <section className={styles.outside} aria-label="Outside the room">
          <div className={styles.panelHead}>
            <span>Outside</span>
            <span className={styles.dim}>the hallway</span>
          </div>
          <ol className={styles.transcript} ref={outsideRef} aria-live="polite">
            {s.lines.map((l, i) => (
              <li key={i} className={l.who === "room" ? styles.roomLine : styles.visitorLine}>
                <span className={styles.who}>{l.who === "room" ? "room" : "visitor"}</span>
                <span>{english(l.toks)}</span>
              </li>
            ))}
            {s.stage !== "done" ? (
              <li className={styles.waiting}>
                <span className={styles.who}>room</span>
                <span>…</span>
              </li>
            ) : (
              <li className={styles.waiting}>The visitor thanks the room and leaves.</li>
            )}
          </ol>
        </section>
      </div>
    </figure>
  );
}
