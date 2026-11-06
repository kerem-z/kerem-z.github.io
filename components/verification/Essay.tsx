"use client";

import { useCallback, useState } from "react";
import { BoxFigure, IntervalFigure, ReluFigure } from "./figures";
import { BabFigure, CompareFigure } from "./more";
import type { Pt } from "./net";
import styles from "./verification.module.css";
import { Scrub, Term, TeX, type Focus } from "./widgets";

// The defaults are a point where the three methods disagree in a useful way:
// IBP certifies up to ε ≈ 0.24, CROWN up to ≈ 0.37, and the truth is ≈ 0.57.
const X0: Pt = [0.75, -1.25];
const EPS = 0.3;

export function VerificationEssay() {
  const [x0, setX0Raw] = useState<Pt>(X0);
  const [eps, setEps] = useState(EPS);
  const [focus, setFocus] = useState<Focus>(null);
  const setX0 = useCallback((p: Pt) => setX0Raw([Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100]), []);
  const box = { x0, eps, setX0, setEps, focus };
  const at = (e: number, p: Pt = X0) => () => {
    setX0(p);
    setEps(e);
  };

  return (
    <article className={`prose ${styles.root}`}>
      <p className={styles.draftNote}>
        <b>Mock post.</b> A test of a format. The network is real and small (two inputs, two hidden layers of eight
        ReLUs, two outputs, trained on a toy data set); every bound on this page is computed in your browser as you
        move things. The claims in the prose are about this network only, and the numbers quoted are for the default
        point; drag it and they change.
      </p>

      <p>
        A trained classifier says that a point is a cat, or here, that a point in the plane belongs to the lower of two
        moons. The question a verifier asks is about every point near it at once: if the input moves by at most{" "}
        <TeX>{"\\varepsilon"}</TeX> in each coordinate, can the answer change? That is a statement with a universal
        quantifier over an uncountable set, and no amount of running the network on examples will establish it. This
        page builds, for one tiny network, the tools that can: a fast one that is often too pessimistic, a sharper one,
        and an exact one that pays for its exactness in search.
      </p>

      <h2>The claim</h2>
      <p>
        Write <TeX>{"z(x) \\in \\mathbb{R}^2"}</TeX> for the network&apos;s two outputs (logits), and let{" "}
        <TeX>{"k"}</TeX> be the class it assigns to a point <TeX>{"x_0"}</TeX>. The <em>margin</em>{" "}
        <TeX>{"m(x) = z_k(x) - z_{k'}(x)"}</TeX>, with <TeX>{"k'"}</TeX> the other class, is positive exactly when{" "}
        <TeX>{"x"}</TeX> gets the same answer as <TeX>{"x_0"}</TeX>. The claim is
      </p>
      <TeX block>{"\\forall x \\in B_\\varepsilon(x_0) = \\{\\, x : \\lVert x - x_0 \\rVert_\\infty \\le \\varepsilon \\,\\}. \\quad m(x) > 0."}</TeX>
      <p>
        With <TeX>{"\\varepsilon ="}</TeX>{" "}
        <Scrub value={eps} min={0.01} max={1} step={0.01} format={(v) => v.toFixed(2)} onChange={setEps} label="Box radius ε" />
        , the box is the square in Figure 1. The figure tests the claim the cheap way, on{" "}
        <Term focus={{ kind: "samples" }} setFocus={setFocus}>
          200 random points
        </Term>
        , and also answers it exactly: with two inputs, the network can be cut into the finitely many polygons on which
        it is affine, and the{" "}
        <Term focus={{ kind: "worst" }} setFocus={setFocus}>
          lowest margin in the box
        </Term>{" "}
        sits at a corner of one of them. That exact answer is the ground truth for the rest of the page. It does not
        scale: the number of such pieces grows very fast with depth and input dimension, and checking them is not an
        option for an image classifier.
      </p>

      <BoxFigure {...box} />
      <p className={styles.caption}>
        <b>Figure 1.</b> The network&apos;s decision on the plane (teal: upper moon, rust: lower moon), with the
        training points and faint contour lines of the margin every four logits. The square is{" "}
        <TeX>{"B_\\varepsilon(x_0)"}</TeX>; dots are the random test points, the cross is the true worst point.
      </p>

      <p>
        Grow the box until it just crosses the boundary, at about{" "}
        <button type="button" className={styles.inlineBtn} onClick={at(0.58)}>
          ε = 0.58
        </button>
        , and the exact answer flips while the random sample misses the sliver of the box that is misclassified:
        from 0.57 to 0.60 the true minimum is negative and not one of the 200 points lands where it is. Testing can find a counterexample; it cannot certify the absence of one. A verifier is what
        does the latter, and two words describe how good it is.
      </p>
      <p className={styles.defn}>
        A verifier is <em>sound</em> if, whenever it says &ldquo;proved&rdquo;, the claim is true. It is{" "}
        <em>complete</em> if, whenever the claim is true, it says &ldquo;proved&rdquo; (and, when the claim is false,
        it can say so). A method that always answers &ldquo;don&apos;t know&rdquo; is sound; the work is in being
        sound and saying &ldquo;proved&rdquo; often.
      </p>
      <p>
        Complete verification of ReLU networks is hard in general: Katz et al. show the problem is NP-complete
        <a href="#ref-katz" className={styles.cite}>
          [1]
        </a>
        . The practical answer is to give up completeness first, with sound over-approximations that run fast, and
        to buy it back with search where needed.
      </p>

      <h2>Pushing a box through a network</h2>
      <p>
        The simplest over-approximation is interval arithmetic. If each input of a layer{" "}
        <TeX>{"z = Wa + b"}</TeX> lies in an interval, so does each output: with centre{" "}
        <TeX>{"\\mu = (\\overline a + \\underline a)/2"}</TeX> and radius{" "}
        <TeX>{"r = (\\overline a - \\underline a)/2"}</TeX>,
      </p>
      <TeX block>{"z \\in \\big[\\, W\\mu + b - |W|\\,r,\\;\\; W\\mu + b + |W|\\,r \\,\\big],"}</TeX>
      <p>
        and a ReLU maps <TeX>{"[l, u]"}</TeX> to <TeX>{"[\\max(l,0), \\max(u,0)]"}</TeX>. Applied layer by layer this
        is interval bound propagation (IBP); Gowal et al. made the case that it is a useful training signal for
        verifiably robust networks
        <a href="#ref-gowal" className={styles.cite}>
          [5]
        </a>
        . It is sound by construction. Figure 2 shows how sharp it is.
      </p>

      <IntervalFigure {...box} />
      <p className={styles.caption}>
        <b>Figure 2.</b> Each row is one neuron&apos;s pre-activation over the box. The pale bar is the outer bound;
        the dark line inside it is the range the box really reaches (exact, from the polygons of Figure 1). A circle
        marks a neuron the bound calls <em>unstable</em> (it might be either side of zero); it is filled if the neuron
        really does change sign in the box, hollow if the bound is merely unable to rule it out. The last row is the
        margin: certified when its pale bar lies right of zero.
      </p>

      <p>
        In the{" "}
        <Term focus={{ kind: "layer", k: 0 }} setFocus={setFocus}>
          first layer
        </Term>{" "}
        IBP is exact: each pre-activation is an affine function of the input, and an affine function on a box is
        extreme at a corner that the interval formula finds. From the{" "}
        <Term focus={{ kind: "layer", k: 1 }} setFocus={setFocus}>
          second layer
        </Term>{" "}
        on it is not. Each interval forgets how its neuron moves together with the others, so a second-layer neuron
        that adds two first-layer neurons that cannot both be large is charged for both being large at once. At the
        default box the total width of the second-layer intervals is 1.7 times the true one and the logits&apos; is
        about twice; the same ratios, averaged over 400 random boxes, came out at 1.6 and 2.0. The margin is worse
        again, because it is a difference of two loose logits. At{" "}
        <button type="button" className={styles.inlineBtn} onClick={at(EPS)}>
          ε = 0.30
        </button>{" "}
        IBP cannot prove the claim, although the true minimum margin is above 15.
      </p>
      <p>
        Looseness compounds. A neuron whose interval straddles zero is{" "}
        <Term focus={{ kind: "unstable" }} setFocus={setFocus}>
          unstable
        </Term>
        , and the next layer must allow it to be anywhere from off to fully on. Some of those are artefacts: at the
        default box, IBP calls three second-layer neurons unstable and only one of them is.
      </p>

      <h2>One ReLU, three straight lines</h2>
      <p>
        The fix is to keep relations between neurons rather than only ranges. For a stable neuron this is free: the
        ReLU is the identity or zero. For an unstable one, with pre-activation <TeX>{"z \\in [l, u]"}</TeX> and{" "}
        <TeX>{"l < 0 < u"}</TeX>, the graph of <TeX>{"y = \\max(0, z)"}</TeX> is a kink, and the best convex
        description of it is the triangle
      </p>
      <TeX block>{"y \\ge 0, \\qquad y \\ge z, \\qquad y \\le \\frac{u\\,(z - l)}{u - l},"}</TeX>
      <p>
        the relaxation used by Ehlers&apos;s Planet, which combines it with a SAT solver that branches on ReLU phases
        <a href="#ref-ehlers" className={styles.cite}>
          [2]
        </a>
        . Feeding these constraints for every neuron into a linear program gives a sound bound; Wong and Kolter build a
        convex outer approximation of this kind and bound it cheaply through its dual
        <a href="#ref-wong" className={styles.cite}>
          [3]
        </a>
        .
      </p>
      <p>
        Faster methods keep one line above and one line below each neuron. The upper line is the chord. Below, there
        are two lower faces of the triangle and room for only one, because the backward pass described next
        substitutes a single linear expression for each neuron. DeepPoly chooses between <TeX>{"y \\ge 0"}</TeX> and{" "}
        <TeX>{"y \\ge z"}</TeX> by which leaves the smaller area
        <a href="#ref-deeppoly" className={styles.cite}>
          [6]
        </a>
        ; CROWN&apos;s adaptive rule is the same: slope 1 when <TeX>{"u \\ge |l|"}</TeX>, slope 0 otherwise
        <a href="#ref-crown" className={styles.cite}>
          [4]
        </a>
        . With slope <TeX>{"\\alpha"}</TeX>, the area between the lines is{" "}
        <TeX>{"\\tfrac12 (u - l)\\,\\big(u - \\alpha (u + l)\\big)"}</TeX>, linear in <TeX>{"\\alpha"}</TeX>, so
        the minimum over <TeX>{"[0,1]"}</TeX> is at an end, and which end depends on the sign of{" "}
        <TeX>{"u + l"}</TeX>.
      </p>

      <ReluFigure x0={x0} eps={eps} />
      <p className={styles.caption}>
        <b>Figure 3.</b> One unstable ReLU. Grey: the triangle. Teal: what the chord and your chosen lower line allow.
        Any slope in <TeX>{"[0, 1]"}</TeX> gives a sound relaxation; the table shows what using the same rule at every
        unstable neuron does to the final bound on the network above.
      </p>

      <p>
        Smaller area for one neuron is a heuristic for a tighter bound on the network, not a guarantee. At the default
        box the area rule and &ldquo;slope 1 everywhere&rdquo; agree. Try{" "}
        <button type="button" className={styles.inlineBtn} onClick={at(0.6)}>
          ε = 0.60
        </button>
        : there &ldquo;slope 0 everywhere&rdquo; gives a bound of about −12, while the area rule gives about −23. All of
        these are sound, so all of them are valid; none certifies this box, which is right, because the claim is false
        there.
      </p>

      <h2>Carrying lines instead of intervals</h2>
      <p>
        With a line above and below every neuron, a bound on the margin can be computed backwards. Start from{" "}
        <TeX>{"m = c^\\top z"}</TeX>, with <TeX>{"c = e_k - e_{k'}"}</TeX>. Replace the last layer by its affine
        formula; the result is a linear function of the second hidden layer&apos;s outputs. For a lower bound, each
        ReLU with a positive coefficient is replaced by its lower line and each with a negative coefficient by its
        upper line. Now the expression is linear in the second layer&apos;s pre-activations; repeat. At the input it
        reads <TeX>{"m(x) \\ge A x + c_0"}</TeX> for every <TeX>{"x"}</TeX> in the box, and the minimum of the right
        side over a box is <TeX>{"A x_0 + c_0 - \\varepsilon \\lVert A \\rVert_1"}</TeX>. The lines need{" "}
        <TeX>{"[l, u]"}</TeX> for each hidden neuron, and those come from the same procedure run on each neuron, one
        layer at a time. This is CROWN
        <a href="#ref-crown" className={styles.cite}>
          [4]
        </a>{" "}
        (DeepPoly&apos;s back-substitution computes the same kind of bound [6]). The bound remembers that two neurons
        are fed by the same input, which intervals forget.
      </p>

      <CompareFigure {...box} />
      <p className={styles.caption}>
        <b>Figure 4.</b> Left: the{" "}
        <Term focus={{ kind: "method", m: "ibp" }} setFocus={setFocus}>
          IBP
        </Term>
        ,{" "}
        <Term focus={{ kind: "method", m: "crown" }} setFocus={setFocus}>
          CROWN
        </Term>{" "}
        and{" "}
        <Term focus={{ kind: "method", m: "exact" }} setFocus={setFocus}>
          exact
        </Term>{" "}
        certified boxes around <TeX>{"x_0"}</TeX>, found by bisection on <TeX>{"\\varepsilon"}</TeX>. Right: where the
        box of Figure 1 lands in logit space. The solid shape is its exact image; the dashed rectangle is IBP; the teal
        polygon is CROWN, bounded in 64 directions. The diagonal is the decision boundary, and the two parallel lines
        are each method&apos;s lower bound on the margin. A method certifies the box when its line stays on{" "}
        <TeX>{"x_0"}</TeX>&apos;s side of the diagonal. The shading options fill the plane with each point&apos;s
        certified radius (capped at 1), computed in a background thread.
      </p>

      <p>
        At the default point, the certified radii are about 0.24 for IBP, 0.37 for CROWN, and 0.57 for the truth. In
        logit space the difference is one of shape. At the default box the true image is a thin sliver, about 25
        logits long across the diagonal and 3 wide along it. IBP must wrap it in an axis-aligned rectangle (about 31
        by 42); CROWN&apos;s polygon has about a twentieth of the rectangle&apos;s area. Shade by &ldquo;what CROWN
        misses&rdquo; to see where in the plane the relaxation gives most away.
      </p>
      <p>
        CROWN is not uniformly tighter than IBP, and the page should not pretend it is. Its relaxations are chosen
        locally, and on a large box errors can add up past what intervals lose. At{" "}
        <button type="button" className={styles.inlineBtn} onClick={at(0.6)}>
          ε = 0.60
        </button>{" "}
        the CROWN bound on the margin is about −22.7 and the IBP bound about −20.1. Both are sound; neither is a
        refinement of the other. A bisection over <TeX>{"\\varepsilon"}</TeX> is also a little delicate for that
        reason: only IBP and the exact answer are guaranteed to fail at every <TeX>{"\\varepsilon"}</TeX> above their
        first failure. (CROWN is not: scanning 300 random points in steps of 0.005, I found one where it fails on a box
        and then certifies a larger one.) The radii reported here are values at which each method actually succeeded, so they are sound
        whether or not the bisection found the largest one.
      </p>

      <h2>Buying completeness back</h2>
      <p>
        A relaxation is loose only because of unstable neurons. Fix one neuron&apos;s phase, say{" "}
        <TeX>{"z \\ge 0"}</TeX>, and in that half of the problem it is linear; the other half has{" "}
        <TeX>{"z \\le 0"}</TeX> and the neuron is zero. Each half is bounded again, with the split imposed as{" "}
        <TeX>{"l \\leftarrow \\max(l, 0)"}</TeX> or <TeX>{"u \\leftarrow \\min(u, 0)"}</TeX>. If a half&apos;s
        lower bound is positive it is done; if its constraints contradict each other, it is empty; otherwise it is split
        again. This is branch and bound over ReLU phases, the frame in which Bunel et al. compare complete verifiers
        <a href="#ref-bunel" className={styles.cite}>
          [7]
        </a>
        ; β-CROWN carries the split constraints into the bound propagation itself
        <a href="#ref-beta" className={styles.cite}>
          [8]
        </a>
        .
      </p>
      <p>
        The implementation in Figure 5 is small but complete. It always splits the open node with the lowest bound, on
        the unstable neuron with the largest coefficient-weighted relaxation gap (a crude version of the scores in
        [7]). Every bound is checked against the corner of the box that minimises it, a real input; if the margin there
        is not positive, that is a counterexample and the search stops. When every unstable neuron of a node has been
        fixed, the network is affine on the node&apos;s region, which is a polygon in the plane, so the node is solved
        exactly at the polygon&apos;s corners. There are finitely many phase patterns, so the search ends, and with
        exact leaves it ends with the right answer. In more dimensions that last step is a linear program, which is
        where the cost goes.
      </p>

      <BabFigure x0={x0} eps={eps} setEps={setEps} />
      <p className={styles.caption}>
        <b>Figure 5.</b> Branch and bound on the box of Figure 1. Left: the box, coloured by which leaf of the tree
        each point belongs to: teal for proved, rust for the leaf with the counterexample, blank for still open. Right:
        the tree drawn as an icicle (each node spans the leaves below it), and the best proven lower bound over time,
        against the true minimum. Point at a node to see its phases and its region.
      </p>

      <p>
        Three presets show the three cases. At{" "}
        <button type="button" className={styles.inlineBtn} onClick={at(0.3)}>
          ε = 0.30
        </button>{" "}
        CROWN proves the claim at the root and there is nothing to split. At{" "}
        <button type="button" className={styles.inlineBtn} onClick={at(0.5)}>
          ε = 0.50
        </button>{" "}
        the claim is true but CROWN&apos;s bound at the root is about −11.6; the search needs 54 splits (109 nodes) to
        prove it. The final certificate says only that the margin is at least about 0.16, far below the true minimum
        of about 4.0: a proof needs every leaf to be positive, not tight. At{" "}
        <button type="button" className={styles.inlineBtn} onClick={at(0.6)}>
          ε = 0.60
        </button>{" "}
        the claim is false, and the search reaches a counterexample after 17 splits.
      </p>

      <h2>What was proved</h2>
      <p>
        When the page says &ldquo;proved&rdquo;, the statement is narrow: this network, this box, this margin. It
        says nothing about a box one step to the right, about other kinds of perturbation, or about whether the
        network&apos;s decision is right in the first place. And it rests on the arithmetic: the code here uses
        ordinary floating point with no outward rounding, so strictly its certificates are sound up to rounding error.
        The margins involved are many orders of magnitude larger than that error, but a verifier for use, as opposed to
        a figure, would round outward or check its certificate in exact arithmetic.
      </p>
      <p>
        At scale, the same three ideas (bound, relax, split) are what current tools combine, with GPUs doing the bound
        propagation; the annual VNN-COMP compares them on shared benchmarks
        <a href="#ref-vnncomp" className={styles.cite}>
          [9]
        </a>
        .
      </p>

      <h2>Notes on the format</h2>
      <ul>
        <li>
          The network has fixed weights (trained once, with a seeded generator), so every number here is the same on
          every machine. The training script is beside the figures in the source.
        </li>
        <li>
          Everything was checked against the exact answer on 400 random boxes: every IBP and CROWN bound contained 2,000
          sampled points per box, every CROWN margin bound sat below the true minimum, and branch and bound agreed with
          the exact answer every time.
        </li>
        <li>
          The radius maps in Figure 4 run three bisections per cell (one per method) over about 7,900 cells, in a Web Worker; everything else
          is fast enough to run while you drag.
        </li>
      </ul>

      <h2 className={styles.refsHead}>References</h2>
      <ol className={styles.refs}>
        <li id="ref-katz">
          G. Katz, C. Barrett, D. Dill, K. Julian, M. Kochenderfer. &ldquo;Reluplex: An Efficient SMT Solver for
          Verifying Deep Neural Networks.&rdquo; <i>CAV</i>, 2017.{" "}
          <a href="https://arxiv.org/abs/1702.01135">arXiv:1702.01135</a>
        </li>
        <li id="ref-ehlers">
          R. Ehlers. &ldquo;Formal Verification of Piece-Wise Linear Feed-Forward Neural Networks.&rdquo; 2017.{" "}
          <a href="https://arxiv.org/abs/1705.01320">arXiv:1705.01320</a>
        </li>
        <li id="ref-wong">
          E. Wong, J. Z. Kolter. &ldquo;Provable Defenses against Adversarial Examples via the Convex Outer Adversarial
          Polytope.&rdquo; <i>ICML</i>, 2018. <a href="https://arxiv.org/abs/1711.00851">arXiv:1711.00851</a>
        </li>
        <li id="ref-crown">
          H. Zhang, T.-W. Weng, P.-Y. Chen, C.-J. Hsieh, L. Daniel. &ldquo;Efficient Neural Network Robustness
          Certification with General Activation Functions.&rdquo; <i>NeurIPS</i>, 2018.{" "}
          <a href="https://arxiv.org/abs/1811.00866">arXiv:1811.00866</a>
        </li>
        <li id="ref-gowal">
          S. Gowal, K. Dvijotham, R. Stanforth, et al. &ldquo;On the Effectiveness of Interval Bound Propagation for
          Training Verifiably Robust Models.&rdquo; 2018 (published at <i>ICCV</i> 2019 as &ldquo;Scalable Verified
          Training for Provably Robust Image Classification&rdquo;).{" "}
          <a href="https://arxiv.org/abs/1810.12715">arXiv:1810.12715</a>
        </li>
        <li id="ref-deeppoly">
          G. Singh, T. Gehr, M. Püschel, M. Vechev. &ldquo;An Abstract Domain for Certifying Neural Networks.&rdquo;{" "}
          <i>Proc. ACM Program. Lang.</i> 3 (POPL), 2019. <a href="https://doi.org/10.1145/3290354">doi:10.1145/3290354</a>
        </li>
        <li id="ref-bunel">
          R. Bunel, J. Lu, I. Turkaslan, P. H. S. Torr, P. Kohli, M. P. Kumar. &ldquo;Branch and Bound for Piecewise
          Linear Neural Network Verification.&rdquo; <i>JMLR</i> 21, 2020.{" "}
          <a href="https://arxiv.org/abs/1909.06588">arXiv:1909.06588</a>
        </li>
        <li id="ref-beta">
          S. Wang, H. Zhang, K. Xu, X. Lin, S. Jana, C.-J. Hsieh, J. Z. Kolter. &ldquo;Beta-CROWN: Efficient Bound
          Propagation with Per-neuron Split Constraints for Complete and Incomplete Neural Network Robustness
          Verification.&rdquo; <i>NeurIPS</i>, 2021. <a href="https://arxiv.org/abs/2103.06624">arXiv:2103.06624</a>
        </li>
        <li id="ref-vnncomp">
          C. Brix, M. N. Müller, S. Bak, T. T. Johnson, C. Liu. &ldquo;First Three Years of the International
          Verification of Neural Networks Competition (VNN-COMP).&rdquo; <i>STTT</i> 25, 2023.{" "}
          <a href="https://arxiv.org/abs/2301.05815">arXiv:2301.05815</a>
        </li>
      </ol>
    </article>
  );
}
