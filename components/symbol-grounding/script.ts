// The dictionary written in an invented script (the same generator as the
// Chinese-room post, with a different seed): a Chinese/Chinese dictionary for
// a reader who reads no Chinese.
import { makeScript } from "../chinese-room/script";
import { GLUE, WORDS } from "./dictionary";

export const SCRIPT = makeScript([...WORDS, ...GLUE], 1990);

/** The glyph for any word in a definition (entry or glue). */
export const glyphFor = (token: string) => SCRIPT[token.toLowerCase()];
