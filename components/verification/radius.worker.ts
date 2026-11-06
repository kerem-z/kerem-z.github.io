// Certified radius at every cell of a grid over the input plane, three ways:
// by intervals, by CROWN, and exactly (the true L∞ distance to the decision
// boundary, to within the bisection tolerance). Posts one row at a time.
import { bisect, boxAround, crownMargin, exactMargin, ibpMargin, predict, regions, within, type Pt } from "./net";
import { NET } from "./weights";

type Msg = { gw: number; gh: number; view: { x0: number; x1: number; y0: number; y1: number }; epsMax: number };

self.onmessage = (e: MessageEvent<Msg>) => {
  const { gw, gh, view, epsMax } = e.data;
  const rs = regions(NET, { lo: [-4, -4], hi: [4, 4] });
  const tol = epsMax / 256;
  for (let j = 0; j < gh; j++) {
    const ibp = new Float32Array(gw);
    const crown = new Float32Array(gw);
    const exact = new Float32Array(gw);
    for (let i = 0; i < gw; i++) {
      const x0: Pt = [view.x0 + ((i + 0.5) / gw) * (view.x1 - view.x0), view.y1 - ((j + 0.5) / gh) * (view.y1 - view.y0)];
      const k = predict(NET, x0);
      ibp[i] = bisect((eps) => ibpMargin(NET, boxAround(x0, eps), k) > 0, epsMax, tol);
      crown[i] = bisect((eps) => crownMargin(NET, boxAround(x0, eps), k) > 0, epsMax, tol);
      exact[i] = bisect((eps) => exactMargin(NET, within(rs, boxAround(x0, eps)), k).value > 0, epsMax, tol);
    }
    self.postMessage({ j, ibp, crown, exact });
  }
};
