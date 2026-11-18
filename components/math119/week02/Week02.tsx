"use client";

import Link from "next/link";
import {
  ComparisonFigure,
  CompositionFigure,
  DominantFigure,
  FloorFigure,
  IvtFigure,
  OscillationFigure,
  PiecewiseFigure,
  ProductFigure,
  QuotientFigure,
  RationalizeFigure,
  RegionFigure,
  SignFigure,
  SineBoundFigure,
  SquareFigure,
} from "./figures";
import styles from "./Week02.module.css";
import { Tex } from "./plot";

function Next({ href }: { href: string }) {
  return (
    <p className={styles.next}>
      <a href={href}>Next</a>
    </p>
  );
}

export function Week02() {
  return (
    <article className={styles.page}>
      <header className={styles.header}>
        <p className="kicker">MATH 119 · Week 02 · Section 161</p>
        <h1 className={styles.title}>Limits and continuity</h1>
      </header>

      <nav className={styles.nav} aria-label="Problems">
        {[
          ["#q1a", "1a"],
          ["#q1b", "1b"],
          ["#q1c", "1c"],
          ["#q1d", "1d"],
          ["#q1e", "1e"],
          ["#q1f", "1f"],
          ["#q1g", "1g"],
          ["#q1h", "1h"],
          ["#q2a", "2a"],
          ["#q2b", "2b"],
          ["#q3", "3"],
          ["#q4", "4"],
          ["#q5", "5"],
          ["#q6a", "6a"],
          ["#q6b", "6b"],
          ["#q6c", "6c"],
          ["#q6d", "6d"],
          ["#q7", "7"],
        ].map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>

      <section className={styles.section} id="q1">
        <p className={styles.tag}>1</p>
        <h2>Limits</h2>

        <section className={styles.block} id="q1a">
          <div className={styles.copy}>
            <p className={styles.tag}>1a</p>
            <div className={styles.statement}>
              <Tex display>
                {String.raw`\lim_{x\to 2}(x^3-8)\sin\frac{1}{x^3-8}`}
              </Tex>
            </div>
            <ol className={styles.steps}>
              <li>
                At <Tex>x=2</Tex> the sine is asked for <Tex>{String.raw`1/0`}</Tex>, so
                the expression is undefined. Substitution is illegal. The sine
                factor has no limit: its argument tends to infinity and it keeps
                oscillating.
              </li>
              <li>
                For every real <Tex>t</Tex>, <Tex>{String.raw`|\sin t|\le 1`}</Tex>. For{" "}
                <Tex>{String.raw`x\neq 2`}</Tex>,
                <Tex display>
                  {String.raw`-|x^3-8|\le (x^3-8)\sin\frac{1}{x^3-8}\le |x^3-8|.`}
                </Tex>
              </li>
              <li>
                Both <Tex>{String.raw`|x^3-8|`}</Tex> and <Tex>{String.raw`-|x^3-8|`}</Tex>{" "}
                tend to 0 as <Tex>{String.raw`x\to 2`}</Tex>. They are defined on a
                punctured neighborhood of 2. The Squeeze Theorem gives the limit
                of the middle expression, so the limit equals 0.
              </li>
            </ol>
          </div>
          <div className={styles.figure}>
            <OscillationFigure />
          </div>
          <Next href="#q1b" />
        </section>

        <section className={styles.block} id="q1b">
          <div className={styles.copy}>
            <p className={styles.tag}>1b</p>
            <div className={styles.statement}>
              <Tex display>
                {String.raw`\lim_{x\to\infty}\frac{4x^3+4x^2+1}{\sqrt{3x^6+x^4-12}}`}
              </Tex>
            </div>
            <ol className={styles.steps}>
              <li>
                This is an <Tex>{String.raw`\infty/\infty`}</Tex> form. Factor{" "}
                <Tex>{String.raw`x^3`}</Tex> from the numerator and{" "}
                <Tex>{String.raw`x^6`}</Tex> from inside the root:
                <Tex display>
                  {String.raw`\frac{x^3\left(4+\frac{4}{x}+\frac{1}{x^3}\right)}{\sqrt{x^6\left(3+\frac{1}{x^2}-\frac{12}{x^6}\right)}}.`}
                </Tex>
              </li>
              <li>
                <Tex>{String.raw`\sqrt{x^6}=|x^3|`}</Tex>. Since{" "}
                <Tex>{String.raw`x\to+\infty`}</Tex>, eventually <Tex>{String.raw`x>0`}</Tex>, so{" "}
                <Tex>{String.raw`|x^3|=x^3`}</Tex>. The powers cancel:
                <Tex display>
                  {String.raw`\frac{4+\frac{4}{x}+\frac{1}{x^3}}{\sqrt{3+\frac{1}{x^2}-\frac{12}{x^6}}}.`}
                </Tex>
              </li>
              <li>
                The inside of the root tends to <Tex>3</Tex>, and <Tex>3&gt;0</Tex>.
                The square root is continuous at 3, so the denominator tends to{" "}
                <Tex>{String.raw`\sqrt{3}`}</Tex> and the limit is{" "}
                <Tex>{String.raw`4/\sqrt{3}`}</Tex>.
              </li>
            </ol>
          </div>
          <div className={styles.figure}>
            <DominantFigure />
          </div>
          <Next href="#q1c" />
        </section>

        <section className={styles.block} id="q1c">
          <div className={styles.copy}>
            <p className={styles.tag}>1c · 1d</p>
            <div className={styles.statement}>
              <Tex display>
                {String.raw`\lim_{x\to-\infty}\frac{1}{\sqrt{x^2+2x}-x}
\qquad
\lim_{x\to-\infty}\frac{1}{\sqrt{x^2+2x}+x}`}
              </Tex>
            </div>
            <p className={styles.statement}>
              For <Tex>{String.raw`x<-2`}</Tex> the expression under the root is positive.
              In both limits,
            </p>
            <Tex display>
              {String.raw`\sqrt{x^2+2x}=\sqrt{x^2\left(1+\frac{2}{x}\right)}=|x|\sqrt{1+\frac{2}{x}}.`}
            </Tex>
            <p className={styles.statement}>
              As <Tex>{String.raw`x\to-\infty`}</Tex>, <Tex>{String.raw`|x|=-x`}</Tex>, so the
              square root equals <Tex>{String.raw`-x\sqrt{1+2/x}`}</Tex>.
            </p>
            <ol className={styles.steps}>
              <li>
                1c. The denominator is{" "}
                <Tex>{String.raw`-x\sqrt{1+2/x}-x=-x\left(\sqrt{1+2/x}+1\right)`}</Tex>.
                Divide numerator and denominator by <Tex>-x</Tex>, which tends to{" "}
                <Tex>{String.raw`+\infty`}</Tex>:
                <Tex display>
                  {String.raw`\frac{1/(-x)}{\sqrt{1+2/x}+1}\to\frac{0}{1+1}=0.`}
                </Tex>
                The denominator tends to 2, so the quotient law applies.
              </li>
              <li id="q1d">
                1d. Here <Tex>{String.raw`\sqrt{x^2+2x}`}</Tex> and <Tex>x</Tex> cancel.
                For <Tex>{String.raw`x<-2`}</Tex> the conjugate{" "}
                <Tex>{String.raw`\sqrt{x^2+2x}-x`}</Tex> is nonzero, because{" "}
                <Tex>{String.raw`\sqrt{x^2+2x}=-x`}</Tex> would force <Tex>x=0</Tex>.
                Multiply by it:
                <Tex display>
                  {String.raw`\frac{1}{\sqrt{x^2+2x}+x}
=\frac{\sqrt{x^2+2x}-x}{2x}
=\frac{-x\sqrt{1+2/x}-x}{2x}
=-\frac{\sqrt{1+2/x}+1}{2}.`}
                </Tex>
                The square root is continuous at 1, so the limit is{" "}
                <Tex>{String.raw`-(1+1)/2=-1`}</Tex>.
              </li>
            </ol>
          </div>
          <div className={styles.figure}>
            <SignFigure />
          </div>
          <Next href="#q1e" />
        </section>

        <section className={styles.block} id="q1e">
          <div className={styles.copy}>
            <p className={styles.tag}>1e</p>
            <div className={styles.statement}>
              <Tex display>{String.raw`\lim_{x\to\infty}\frac{\sin x}{3x}`}</Tex>
            </div>
            <ol className={styles.steps}>
              <li>
                <Tex>{String.raw`\sin x`}</Tex> has no limit as{" "}
                <Tex>{String.raw`x\to\infty`}</Tex>, so the quotient law does not apply
                directly. For <Tex>{String.raw`x>0`}</Tex>,
                <Tex display>
                  {String.raw`\left|\frac{\sin x}{3x}\right|\le\frac{1}{3x},`}
                </Tex>
                hence
                <Tex display>
                  {String.raw`-\frac{1}{3x}\le\frac{\sin x}{3x}\le\frac{1}{3x}.`}
                </Tex>
              </li>
              <li>
                Both <Tex>{String.raw`\pm 1/(3x)`}</Tex> tend to 0. The Squeeze Theorem
                on <Tex>{String.raw`(0,\infty)`}</Tex> gives the limit 0.
              </li>
            </ol>
          </div>
          <div className={styles.figure}>
            <SineBoundFigure />
          </div>
          <Next href="#q1f" />
        </section>

        <section className={styles.block} id="q1f">
          <div className={styles.copy}>
            <p className={styles.tag}>1f</p>
            <div className={styles.statement}>
              <Tex display>
                {String.raw`\lim_{x\to-\infty}\sin\left(\frac{\pi x^2+5x+1}{x^2+1}-\frac{\pi}{6}\right)`}
              </Tex>
            </div>
            <ol className={styles.steps}>
              <li>
                First take the inside. Divide numerator and denominator by{" "}
                <Tex>{String.raw`x^2`}</Tex>:
                <Tex display>
                  {String.raw`\frac{\pi+5/x+1/x^2}{1+1/x^2}\to\pi,`}
                </Tex>
                so the inside tends to <Tex>{String.raw`\pi-\pi/6=5\pi/6`}</Tex>.
              </li>
              <li>
                Sine is continuous at <Tex>{String.raw`5\pi/6`}</Tex>. If{" "}
                <Tex>{String.raw`\lim u(x)=L`}</Tex> and <Tex>g</Tex> is continuous at{" "}
                <Tex>L</Tex>, then <Tex>{String.raw`\lim g(u(x))=g(L)`}</Tex>. Therefore
                the limit is <Tex>{String.raw`\sin(5\pi/6)=1/2`}</Tex>.
              </li>
            </ol>
          </div>
          <div className={styles.figure}>
            <CompositionFigure />
          </div>
          <Next href="#q1g" />
        </section>

        <section className={styles.block} id="q1g">
          <div className={styles.copy}>
            <p className={styles.tag}>1g</p>
            <div className={styles.statement}>
              <Tex display>
                {String.raw`\lim_{x\to\infty}\left(\sqrt{x^2+x}-\sqrt{x^2-x}\right)`}
              </Tex>
            </div>
            <ol className={styles.steps}>
              <li>
                This is an <Tex>{String.raw`\infty-\infty`}</Tex> form. For{" "}
                <Tex>{String.raw`x>1`}</Tex> both roots are defined. Multiply by the
                conjugate:
                <Tex display>
                  {String.raw`\frac{(x^2+x)-(x^2-x)}{\sqrt{x^2+x}+\sqrt{x^2-x}}
=\frac{2x}{\sqrt{x^2+x}+\sqrt{x^2-x}}.`}
                </Tex>
              </li>
              <li>
                Factor <Tex>{String.raw`x^2`}</Tex> out of each root. For{" "}
                <Tex>{String.raw`x>0`}</Tex>, <Tex>{String.raw`\sqrt{x^2}=|x|=x`}</Tex>, so
                <Tex display>
                  {String.raw`\frac{2}{\sqrt{1+1/x}+\sqrt{1-1/x}}\to\frac{2}{1+1}=1.`}
                </Tex>
                The square root is continuous at 1.
              </li>
            </ol>
          </div>
          <div className={styles.figure}>
            <RationalizeFigure />
          </div>
          <Next href="#q1h" />
        </section>

        <section className={styles.block} id="q1h">
          <div className={styles.copy}>
            <p className={styles.tag}>1h</p>
            <div className={styles.statement}>
              <Tex display>
                {String.raw`\lim_{x\to\infty}\frac{x^2(2+\sin^2 x)}{3x+1}`}
              </Tex>
            </div>
            <ol className={styles.steps}>
              <li>
                <Tex>{String.raw`\sin^2 x`}</Tex> oscillates between 0 and 1 and has no
                limit. For every <Tex>x</Tex>,
                <Tex display>{String.raw`2\le 2+\sin^2 x\le 3.`}</Tex>
              </li>
              <li>
                For <Tex>{String.raw`x>0`}</Tex> the denominator is positive, so
                <Tex display>
                  {String.raw`\frac{2x^2}{3x+1}\le\frac{x^2(2+\sin^2 x)}{3x+1}\le\frac{3x^2}{3x+1}.`}
                </Tex>
              </li>
              <li>
                The lower bound simplifies to{" "}
                <Tex>{String.raw`2x/(3+1/x)`}</Tex>, which tends to{" "}
                <Tex>{String.raw`+\infty`}</Tex>. A quantity sitting above a function
                that tends to <Tex>{String.raw`+\infty`}</Tex> also tends to{" "}
                <Tex>{String.raw`+\infty`}</Tex>.
              </li>
            </ol>
          </div>
          <div className={styles.figure}>
            <QuotientFigure />
          </div>
          <Next href="#q2a" />
        </section>
      </section>

      <section className={styles.section} id="q2">
        <p className={styles.tag}>2</p>
        <h2>Limit laws</h2>

        <section className={styles.block} id="q2a">
          <div className={styles.copy}>
            <p className={styles.tag}>2a</p>
            <div className={styles.statement}>
              <Tex display>
                {String.raw`\lim_{x\to a}\bigl(f(x)+g(x)\bigr)=2,
\qquad
\lim_{x\to a}\bigl(f(x)-g(x)\bigr)=5.`}
              </Tex>
              Find <Tex>{String.raw`\lim_{x\to a} f(x)g(x)`}</Tex>.
            </div>
            <ol className={styles.steps}>
              <li>
                The separate functions are
                <Tex display>
                  {String.raw`f=\frac{(f+g)+(f-g)}{2},\qquad
g=\frac{(f+g)-(f-g)}{2}.`}
                </Tex>
                The sum and difference laws apply to the two given limits, so
                both limits exist:
                <Tex display>
                  {String.raw`\lim f=\frac{2+5}{2}=\frac72,\qquad
\lim g=\frac{2-5}{2}=-\frac32.`}
                </Tex>
              </li>
              <li>
                Both limits are finite, so the product law applies:
                <Tex display>
                  {String.raw`\lim fg=\frac72\cdot\left(-\frac32\right)=-\frac{21}{4}.`}
                </Tex>
              </li>
            </ol>
          </div>
          <Next href="#q2b" />
        </section>

        <section className={styles.block} id="q2b">
          <div className={styles.copy}>
            <p className={styles.tag}>2b</p>
            <div className={styles.statement}>
              <Tex display>
                {String.raw`\lim_{x\to 3}\frac{f(x)-5}{x-3}=4.`}
              </Tex>
              Show that <Tex>{String.raw`\lim_{x\to 3}f(x)`}</Tex> exists, and find it.
            </div>
            <p className={styles.statement}>
              The quotient has the shape of a derivative, and differentiability
              is not assumed. Only algebra and the product law are used.
            </p>
            <ol className={styles.steps}>
              <li>
                Let <Tex>{String.raw`h(x)=(f(x)-5)/(x-3)`}</Tex> for{" "}
                <Tex>{String.raw`x\neq 3`}</Tex>. The hypothesis is{" "}
                <Tex>{String.raw`\lim_{x\to 3}h(x)=4`}</Tex>.
              </li>
              <li>
                Rearrange, for <Tex>{String.raw`x\neq 3`}</Tex>:
                <Tex display>{String.raw`f(x)-5=(x-3)\,h(x).`}</Tex>
              </li>
              <li>
                <Tex>{String.raw`x-3\to 0`}</Tex> and <Tex>{String.raw`h(x)\to 4`}</Tex>,
                both finite, so the product law gives
                <Tex display>
                  {String.raw`\lim_{x\to 3}(f(x)-5)=0\cdot 4=0.`}
                </Tex>
                Therefore <Tex>{String.raw`\lim_{x\to 3}f(x)=5`}</Tex>.
              </li>
            </ol>
          </div>
          <Next href="#q3" />
        </section>
      </section>

      <section className={styles.section} id="q3">
        <p className={styles.tag}>3</p>
        <h2>Floor function</h2>
        <div className={styles.copy}>
          <div className={styles.statement}>
            <Tex display>
              {String.raw`\lim_{x\to 0^-}\left\lfloor\frac{x^3-x}{x^4-1}\right\rfloor`}
            </Tex>
          </div>
          <div className={styles.wrong}>
            <p>
              The following calculation is not valid.
            </p>
            <Tex display>
              {String.raw`\lim_{x\to 0^-}\left\lfloor\frac{x^3-x}{x^4-1}\right\rfloor
=\left\lfloor\lim_{x\to 0^-}\frac{x^3-x}{x^4-1}\right\rfloor
=\lfloor 0\rfloor=0.`}
            </Tex>
            <p>
              Passing a limit through an outer function needs that outer function
              to be continuous at the limiting value. The floor function is
              discontinuous at every integer, and this limit is the integer 0.
            </p>
          </div>
          <ol className={styles.steps}>
            <li>
              For <Tex>{String.raw`x^2\neq 1`}</Tex>,
              <Tex display>
                {String.raw`h(x)=\frac{x^3-x}{x^4-1}=\frac{x(x^2-1)}{(x^2-1)(x^2+1)}=\frac{x}{x^2+1}.`}
              </Tex>
            </li>
            <li>
              Restrict to <Tex>{String.raw`-1<x<0`}</Tex>. Then{" "}
              <Tex>{String.raw`h(x)<0`}</Tex>. Also
              <Tex display>
                {String.raw`h(x)-x=x\left(\frac{1}{x^2+1}-1\right)=\frac{-x^3}{x^2+1}>0,`}
              </Tex>
              because <Tex>x</Tex> is negative and <Tex>{String.raw`-x^3`}</Tex> is
              positive. So <Tex>{String.raw`-1<x<h(x)<0`}</Tex>.
            </li>
            <li>
              Every number in <Tex>{String.raw`(-1,0)`}</Tex> has floor <Tex>-1</Tex>.
              Thus <Tex>{String.raw`\lfloor h(x)\rfloor=-1`}</Tex> throughout a left
              neighborhood of 0, and the limit is that constant.
            </li>
            </ol>
        </div>
        <div className={styles.figure}>
          <FloorFigure />
        </div>
        <Next href="#q4" />
      </section>

      <section className={styles.section} id="q4">
        <p className={styles.tag}>4</p>
        <h2>Piecewise continuity</h2>
        <div className={styles.copy}>
          <div className={styles.statement}>
            <Tex display>
              {String.raw`f(x)=\begin{cases}
\sin(ax)/x & x<0,\\
3+x^3\sin(\pi/x^3) & 0\le x\le 1,\\
ax+b & x>1.
\end{cases}`}
            </Tex>
            Find <Tex>a</Tex> and <Tex>b</Tex> so that <Tex>f</Tex> is continuous
            everywhere, if such values exist.
          </div>
          <p className={styles.statement}>
            Continuity at <Tex>c</Tex> means three things: <Tex>f(c)</Tex> is defined,{" "}
            <Tex>{String.raw`\lim_{x\to c}f(x)`}</Tex> exists, and the limit equals{" "}
            <Tex>f(c)</Tex>.
          </p>
          <p className={styles.statement}>
            The pieces meet at <Tex>x=0</Tex> and <Tex>x=1</Tex>. Elsewhere each
            piece is a quotient, a sine, or a polynomial, and those are continuous
            on the open intervals where they are used. The middle formula is the
            one that has to be checked at the endpoint <Tex>x=0</Tex>.
          </p>
          <Tex display>
            {String.raw`f(0)=3+0^3\sin\left(\frac{\pi}{0^3}\right).`}
          </Tex>
          <p className={styles.statement}>
            <Tex>{String.raw`\pi/0^3`}</Tex> is undefined. Multiplying an undefined
            quantity by <Tex>{String.raw`0^3`}</Tex> does not produce a real number.
            So <Tex>f(0)</Tex> is not defined. Continuity at 0 already fails, for
            every real <Tex>a</Tex> and <Tex>b</Tex>.
          </p>
          <p className={styles.banner}>
            No real numbers <Tex>a</Tex> and <Tex>b</Tex> make the printed function
            continuous everywhere.
          </p>
          <div className={styles.aside}>
            <p className={styles.tag}>Extension</p>
            <h3>Where a = 3 and b = 0 come from</h3>
            <p>
              The one-sided limits can still be computed on the punctured
              neighborhoods, where the formulas are defined. They describe a
              continuous extension. They do not repair the printed formula.
            </p>
            <p>
              As <Tex>{String.raw`x\to 0^-`}</Tex>,
            </p>
            <Tex display>
              {String.raw`\frac{\sin(ax)}{x}=a\cdot\frac{\sin(ax)}{ax}\to a`}
            </Tex>
            <p>
              when <Tex>{String.raw`a\neq 0`}</Tex>, because{" "}
              <Tex>{String.raw`\sin u/u\to 1`}</Tex> as <Tex>{String.raw`u\to 0`}</Tex>.
              If <Tex>a=0</Tex>, the quotient is 0, which is the same limit.
            </p>
            <p>
              As <Tex>{String.raw`x\to 0^+`}</Tex>,{" "}
              <Tex>{String.raw`|x^3\sin(\pi/x^3)|\le |x|^3\to 0`}</Tex>, so the
              middle piece tends to 3. Matching one-sided limits forces{" "}
              <Tex>a=3</Tex>.
            </p>
            <p>
              At <Tex>x=1</Tex> the middle formula is defined:{" "}
              <Tex>{String.raw`f(1)=3+\sin\pi=3`}</Tex>. The right-hand limit of{" "}
              <Tex>{String.raw`ax+b`}</Tex> is <Tex>{String.raw`a+b`}</Tex>. Continuity
              at 1 forces <Tex>{String.raw`a+b=3`}</Tex>. With <Tex>a=3</Tex>, one
              gets <Tex>b=0</Tex>.
            </p>
            <p>
              Those values make the limits agree. The printed function is still
              missing <Tex>f(0)</Tex>. Defining <Tex>f(0)=3</Tex> by hand produces
              a continuous extension, which is a new function.
            </p>
          </div>
        </div>
        <div className={styles.figure}>
          <PiecewiseFigure />
        </div>
        <Next href="#q5" />
      </section>

      <section className={styles.section} id="q5">
        <p className={styles.tag}>5</p>
        <h2>Squeeze theorem</h2>
        <div className={styles.copy}>
          <div className={styles.statement}>
            Suppose <Tex>{String.raw`|f(x)|\le x^2`}</Tex> for every real <Tex>x</Tex>.
            Show that <Tex>f</Tex> is continuous at 0.
          </div>
          <ol className={styles.steps}>
            <li>
              The inequality holds at <Tex>x=0</Tex>:{" "}
              <Tex>{String.raw`|f(0)|\le 0`}</Tex>. Absolute value is nonnegative, so{" "}
              <Tex>{String.raw`f(0)=0`}</Tex>.
            </li>
            <li>
              The same inequality is
              <Tex display>{String.raw`-x^2\le f(x)\le x^2.`}</Tex>
              Both <Tex>{String.raw`-x^2`}</Tex> and <Tex>{String.raw`x^2`}</Tex> tend to
              0 as <Tex>{String.raw`x\to 0`}</Tex>. The Squeeze Theorem gives{" "}
              <Tex>{String.raw`\lim_{x\to 0}f(x)=0`}</Tex>.
            </li>
            <li>
              The limit equals <Tex>f(0)</Tex>, so <Tex>f</Tex> is continuous at 0.
            </li>
            </ol>
        </div>
        <div className={styles.figure}>
          <RegionFigure />
        </div>
        <Next href="#q6a" />
      </section>

      <section className={styles.section} id="q6">
        <p className={styles.tag}>6</p>
        <h2>True or false</h2>

        <section className={styles.block} id="q6a">
          <div className={styles.copy}>
            <p className={styles.tag}>6a</p>
            <div className={styles.statement}>
              If <Tex>{String.raw`\lim_{x\to 0}f^2(x)=4`}</Tex>, then{" "}
              <Tex>{String.raw`\bigl(\lim_{x\to 0}f(x)\bigr)^2=4`}</Tex>.
              Here <Tex>{String.raw`f^2(x)`}</Tex> means <Tex>{String.raw`[f(x)]^2`}</Tex>.
            </div>
            <p>
              Let <Tex>{String.raw`f(x)=2\operatorname{sgn}(x)`}</Tex> for{" "}
              <Tex>{String.raw`x\neq 0`}</Tex>. Then{" "}
              <Tex>{String.raw`[f(x)]^2=4`}</Tex>, so the limit of the square is 4.
              The right-hand limit of <Tex>f</Tex> is 2 and the left-hand limit is{" "}
              <Tex>-2</Tex>, so <Tex>{String.raw`\lim_{x\to 0}f(x)`}</Tex> does not
              exist. Squaring has removed the sign that separated the two sides,
              so the statement is false.
            </p>
          </div>
          <div className={styles.figure}>
            <SquareFigure />
          </div>
          <Next href="#q6b" />
        </section>

        <section className={styles.block} id="q6b">
          <div className={styles.copy}>
            <p className={styles.tag}>6b</p>
            <div className={styles.statement}>
              If <Tex>{String.raw`\lim_{x\to a}f(x)`}</Tex> exists and{" "}
              <Tex>{String.raw`\lim_{x\to a}g(x)`}</Tex> does not, then{" "}
              <Tex>{String.raw`\lim_{x\to a}\bigl(f(x)+g(x)\bigr)`}</Tex> does not exist.
            </div>
            <p>
              Let <Tex>{String.raw`\lim f=L`}</Tex>. Suppose, for a contradiction,
              that <Tex>{String.raw`\lim(f+g)=M`}</Tex>. For{" "}
              <Tex>x</Tex> near <Tex>a</Tex>,
            </p>
            <Tex display>{String.raw`g(x)=\bigl(f(x)+g(x)\bigr)-f(x).`}</Tex>
            <p>
              The difference law applies because both limits exist and are finite,
              so <Tex>{String.raw`\lim g=M-L`}</Tex>. That contradicts the hypothesis
              that <Tex>{String.raw`\lim g`}</Tex> does not exist. Therefore{" "}
              <Tex>{String.raw`\lim(f+g)`}</Tex> does not exist, and the statement
              is true.
            </p>
          </div>
          <Next href="#q6c" />
        </section>

        <section className={styles.block} id="q6c">
          <div className={styles.copy}>
            <p className={styles.tag}>6c</p>
            <div className={styles.statement}>
              If <Tex>{String.raw`\lim_{x\to 0}f(x)`}</Tex> exists and{" "}
              <Tex>{String.raw`\lim_{x\to 0}g(x)`}</Tex> does not, then{" "}
              <Tex>{String.raw`\lim_{x\to 0}f(x)g(x)`}</Tex> does not exist.
            </div>
            <p>
              Take <Tex>{String.raw`f(x)=x`}</Tex> and{" "}
              <Tex>{String.raw`g(x)=1/x`}</Tex> for <Tex>{String.raw`x\neq 0`}</Tex>.
              Then <Tex>{String.raw`\lim f=0`}</Tex>, while <Tex>g</Tex> has no finite
              limit. The product is <Tex>1</Tex> for every{" "}
              <Tex>{String.raw`x\neq 0`}</Tex>, so{" "}
              <Tex>{String.raw`\lim fg=1`}</Tex>. The statement is false.
            </p>
          </div>
          <div className={styles.figure}>
            <ProductFigure />
          </div>
          <Next href="#q6d" />
        </section>

        <section className={styles.block} id="q6d">
          <div className={styles.copy}>
            <p className={styles.tag}>6d</p>
            <div className={styles.statement}>
              If <Tex>{String.raw`f(x)\le g(x)`}</Tex> for every real <Tex>x</Tex>, then{" "}
              <Tex>{String.raw`\lim_{x\to a}f(x)\le\lim_{x\to a}g(x)`}</Tex>.
            </div>
            <p>
              The statement never assumes that the limits exist. Let{" "}
              <Tex>{String.raw`f(x)=\operatorname{sgn}(x)`}</Tex>,{" "}
              <Tex>{String.raw`g(x)=1`}</Tex>, and <Tex>a=0</Tex>, with{" "}
              <Tex>{String.raw`\operatorname{sgn}(0)=0`}</Tex>. Then{" "}
              <Tex>{String.raw`f(x)\le g(x)`}</Tex> for every <Tex>x</Tex>, but{" "}
              <Tex>{String.raw`\lim_{x\to 0}f(x)`}</Tex> does not exist, so the
              statement is false. When both limits exist and are finite, and{" "}
              <Tex>{String.raw`f\le g`}</Tex> near <Tex>a</Tex>, the inequality of
              the limits does hold.
            </p>
          </div>
          <div className={styles.figure}>
            <ComparisonFigure />
          </div>
          <Next href="#q7" />
        </section>
      </section>

      <section className={styles.section} id="q7">
        <p className={styles.tag}>7</p>
        <h2>Intermediate value theorem</h2>
        <div className={styles.copy}>
          <div className={styles.statement}>
            If <Tex>f</Tex> is continuous on <Tex>[0,2]</Tex>, with{" "}
            <Tex>{String.raw`f(0)>0`}</Tex> and <Tex>{String.raw`f(2)<4`}</Tex>, show
            that some <Tex>c</Tex> in <Tex>(0,2)</Tex> satisfies{" "}
            <Tex>{String.raw`f(c)=c^2`}</Tex>.
          </div>
          <ol className={styles.steps}>
            <li>
              The equation <Tex>{String.raw`f(c)=c^2`}</Tex> is the same as{" "}
              <Tex>{String.raw`h(c)=0`}</Tex> for
              <Tex display>{String.raw`h(x)=f(x)-x^2.`}</Tex>
            </li>
            <li>
              <Tex>f</Tex> is continuous on <Tex>[0,2]</Tex> and{" "}
              <Tex>{String.raw`x^2`}</Tex> is continuous everywhere, so{" "}
              <Tex>h</Tex> is continuous on <Tex>[0,2]</Tex>.
            </li>
            <li>
              <Tex>{String.raw`h(0)=f(0)>0`}</Tex> and{" "}
              <Tex>{String.raw`h(2)=f(2)-4<0`}</Tex>. The value 0 lies strictly
              between <Tex>h(0)</Tex> and <Tex>h(2)</Tex>.
            </li>
            <li>
              The Intermediate Value Theorem applies to a function continuous on
              a closed bounded interval: it attains every value between its
              endpoint values. So some <Tex>c</Tex> in <Tex>(0,2)</Tex> has{" "}
              <Tex>{String.raw`h(c)=0`}</Tex>, that is{" "}
              <Tex>{String.raw`f(c)=c^2`}</Tex>.
            </li>
            </ol>
        </div>
        <div className={styles.figure}>
          <IvtFigure />
        </div>
      </section>

      <p className={styles.back}>
        <Link href="/courses/math-119/">← MATH 119</Link>
      </p>
    </article>
  );
}
