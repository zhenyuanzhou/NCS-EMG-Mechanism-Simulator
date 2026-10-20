// Volume-conductor (line-source) model.
//
// What the electrode measures: the extracellular potential produced by transmembrane
// currents of an active fibre. For a fibre with intracellular potential Vm(x), the
// membrane current density is proportional to d²Vm/dx² (outward = source = positive
// potential; inward = sink = negative potential). The extracellular potential at a
// point is the sum of these sources weighted by 1/distance.
//
// Consequence (textbook p.20–21, Fig 2.19–2.20): an action potential that approaches,
// passes under and leaves an electrode produces + / − / + (triphasic); one that starts
// under the electrode produces an initial negativity; one that never reaches the
// electrode produces mainly positivity. These shapes are NOT drawn by hand here – they
// emerge from the geometry below.
//
// Intracellular profile: Rosenfalck (1969) Vm(z) = 96 z³ e^(−z) − 90 mV (z in mm behind
// the depolarisation front, muscle fibre). We use the depolarisation part 96 z³ e^(−z).

export const DT = 0.05; // ms, global sample interval (20 kHz)

export function rosenfalck(z) {
  return z <= 0 ? 0 : 96 * z * z * z * Math.exp(-z);
}

// ---------------------------------------------------------------------------
// Finite muscle fibre, action potential initiated at the endplate (x = 0) and
// propagating in both directions until it is extinguished at the fibre ends.
// Returns the potential (mV) at electrodes located at (r, z0) for each time sample.
// ---------------------------------------------------------------------------
export function fiberFieldSeries({
  v = 4, // mm/ms (= m/s)
  s = 1, // spatial scale of the Rosenfalck profile (mm)
  halfLen = 30, // mm from endplate to each fibre end
  h = 0.2, // spatial grid (mm)
  T = 14, // ms of simulated time
  dt = DT,
  K = 0.0005, // line-source constant (mm²) ~ a²σi/(4σe) for a 50 µm fibre
  electrodes, // [{r, z0, aniso}] r radial distance (mm), z0 axial offset from endplate (mm)
  blockAt = null, // optional axial position where propagation is extinguished (crushed zone)
  blockLambda = 0, // mm: if >0, the inexcitable zone is passively (electrotonically) depolarised
  endTaper = 0, // mm over which the AP decrements before the fibre ends
  endMode = 'fade', // 'fade': whole AP amplitude decrements (balanced currents, schematic)
  //                   'spatial': sources fade by position (produces fibre-end far fields)
}) {
  const nx = Math.round((2 * halfLen) / h) + 1;
  const xs = new Float64Array(nx);
  for (let k = 0; k < nx; k++) xs[k] = -halfLen + k * h;
  const nt = Math.round(T / dt);
  // geometric weights per electrode
  // Weight of each spatial cell: exact integral of 1/R over the cell (current density taken
  // as constant within a cell) – accurate even when the electrode is much closer to the
  // fibre than the grid spacing (needle recordings).
  const W = electrodes.map((e) => {
    const w = new Float64Array(nx);
    const ra = Math.sqrt(e.aniso || 1) * Math.max(e.r, 1e-4);
    for (let k = 0; k < nx; k++) {
      const u1 = (xs[k] + h / 2 - e.z0) / ra;
      const u0 = (xs[k] - h / 2 - e.z0) / ra;
      w[k] = K * (Math.asinh(u1) - Math.asinh(u0));
    }
    return w;
  });
  // taper weights: a schematic stand-in for the distributed tendon junctions of real fibres
  const taper = new Float64Array(nx);
  for (let k = 0; k < nx; k++) {
    const d = halfLen - Math.abs(xs[k]);
    if (endMode !== 'spatial' || endTaper <= 0 || d >= endTaper) taper[k] = 1;
    else {
      const u = Math.max(0, d / endTaper);
      taper[k] = u * u * (3 - 2 * u);
    }
  }
  const out = electrodes.map(() => new Float64Array(nt));
  const Vm = new Float64Array(nx);
  for (let n = 0; n < nt; n++) {
    const t = n * dt;
    const front = v * t;
    // 'fade' mode: the AP decrements as a whole as the front approaches the fibre end
    let A = 1;
    if (endMode === 'fade' && endTaper > 0) {
      const d = halfLen - front;
      if (d <= 0) A = 0;
      else if (d < endTaper) {
        const u = d / endTaper;
        A = u * u * (3 - 2 * u);
      }
    }
    let Vb = 0;
    if (blockAt !== null && blockLambda > 0) {
      const zb = (front - Math.abs(blockAt)) / s;
      Vb = zb > 0 ? A * rosenfalck(zb) : 0;
    }
    for (let k = 0; k < nx; k++) {
      const ax = Math.abs(xs[k]);
      let z = (front - ax) / s;
      if (blockAt !== null) {
        // propagation stops at the crushed zone: membrane beyond it cannot fire; it is only
        // depolarised passively (electrotonic decay with length constant blockLambda)
        const beyond = blockAt >= 0 ? xs[k] > blockAt : xs[k] < blockAt;
        if (beyond) {
          Vm[k] = blockLambda > 0 ? Vb * Math.exp(-Math.abs(xs[k] - blockAt) / blockLambda) : 0;
          continue;
        }
      }
      Vm[k] = z > 0 ? A * rosenfalck(z) : 0;
    }
    // membrane current ∝ second spatial derivative, sealed ends (zero axial current)
    for (let e = 0; e < electrodes.length; e++) {
      const w = W[e];
      let acc = 0;
      for (let k = 0; k < nx; k++) {
        const left = k === 0 ? Vm[1] : Vm[k - 1];
        const right = k === nx - 1 ? Vm[nx - 2] : Vm[k + 1];
        const im = (left - 2 * Vm[k] + right) / (h * h);
        acc += im * w[k] * taper[k];
      }
      out[e][n] = acc;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Lookup table of single-fibre potentials for many (r, z0) positions at a reference
// velocity. Other velocities are obtained by time-scaling (exact for the propagating
// part: the potential depends only on the front position v·t).
// ---------------------------------------------------------------------------
export class FiberTable {
  constructor({ rs, z0s, vRef = 4, s = 1, halfLen = 30, T = 14, aniso = 1, symmetric = true, h = 0.2, endTaper = 0, endMode = 'fade' }) {
    this.rs = rs;
    this.logRs = rs.map(Math.log);
    this.z0s = z0s;
    this.vRef = vRef;
    this.T = T;
    this.nt = Math.round(T / DT);
    this.data = []; // [ir][iz] -> Float64Array
    const electrodes = [];
    const idx = [];
    for (let ir = 0; ir < rs.length; ir++) {
      this.data.push(new Array(z0s.length));
      for (let iz = 0; iz < z0s.length; iz++) {
        if (symmetric && z0s[iz] < 0) continue; // filled from mirror below
        electrodes.push({ r: rs[ir], z0: z0s[iz], aniso });
        idx.push([ir, iz]);
      }
    }
    const series = fiberFieldSeries({ v: vRef, s, halfLen, T, electrodes, h, endTaper, endMode });
    idx.forEach(([ir, iz], j) => {
      this.data[ir][iz] = series[j];
    });
    if (symmetric) {
      for (let ir = 0; ir < rs.length; ir++) {
        for (let iz = 0; iz < z0s.length; iz++) {
          if (z0s[iz] < 0) {
            const mirror = z0s.findIndex((z) => Math.abs(z + z0s[iz]) < 1e-9);
            this.data[ir][iz] = this.data[ir][mirror];
          }
        }
      }
    }
  }

  _bracket(arr, x) {
    if (x <= arr[0]) return [0, 0, 0];
    const n = arr.length;
    if (x >= arr[n - 1]) return [n - 1, n - 1, 0];
    let lo = 0;
    let hi = n - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] <= x) lo = mid;
      else hi = mid;
    }
    return [lo, hi, (x - arr[lo]) / (arr[hi] - arr[lo])];
  }

  // Accumulate gain·φ(t − delay) for a fibre at radial distance r and axial offset z0,
  // with conduction velocity v, into dst (sampled at DT). Bilinear in (log r, z0).
  addInto(dst, r, z0, delayMs, gain = 1, v = this.vRef) {
    const [r0, r1, fr] = this._bracket(this.logRs, Math.log(Math.max(r, this.rs[0])));
    const [z0i, z1i, fz] = this._bracket(this.z0s, z0);
    const a = this.data[r0][z0i];
    const b = this.data[r1][z0i];
    const c = this.data[r0][z1i];
    const d = this.data[r1][z1i];
    const w00 = (1 - fr) * (1 - fz);
    const w10 = fr * (1 - fz);
    const w01 = (1 - fr) * fz;
    const w11 = fr * fz;
    const scale = v / this.vRef; // time compression factor
    const n = dst.length;
    const nt = this.nt;
    const d0 = delayMs / DT;
    const iStart = Math.max(0, Math.ceil(d0));
    const iEnd = Math.min(n, Math.floor(d0 + (nt - 1) / scale));
    for (let i = iStart; i < iEnd; i++) {
      const u = (i - d0) * scale; // index into the reference series
      const k = Math.floor(u);
      const f = u - k;
      const k1 = k + 1 < nt ? k + 1 : k;
      const va = a[k] + (a[k1] - a[k]) * f;
      const vb = b[k] + (b[k1] - b[k]) * f;
      const vc = c[k] + (c[k1] - c[k]) * f;
      const vd = d[k] + (d[k1] - d[k]) * f;
      dst[i] += gain * (w00 * va + w10 * vb + w01 * vc + w11 * vd);
    }
  }
}

// ---------------------------------------------------------------------------
// Travelling nerve-fibre kernel. Far from initiation and from fibre ends, the potential
// at an electrode is a fixed spatial waveform sliding past at the conduction velocity.
// Ĝ(w; ρ) with w = (front − electrode)/s and ρ = r/s is tabulated once.
// ---------------------------------------------------------------------------
export class TravellingKernel {
  constructor({ rhos, wMin = -12, wMax = 30, dw = 0.05 }) {
    this.rhos = rhos;
    this.logRhos = rhos.map(Math.log);
    this.wMin = wMin;
    this.dw = dw;
    this.nw = Math.round((wMax - wMin) / dw) + 1;
    this.data = rhos.map((rho) => {
      const g = new Float64Array(this.nw);
      // integrate p''(z)/sqrt((w − z)² + ρ²) over z ∈ [0, 25]
      const dz = 0.02;
      const nz = Math.round(25 / dz);
      const p2 = new Float64Array(nz + 1);
      for (let j = 0; j <= nz; j++) {
        const z = j * dz;
        // analytic second derivative of 96 z³ e^(−z)
        p2[j] = 96 * (6 * z - 6 * z * z + z * z * z) * Math.exp(-z);
      }
      // the kink at z = 0 (front) has zero slope for z³, so no delta term is needed
      for (let i = 0; i < this.nw; i++) {
        const w = wMin + i * dw;
        let acc = 0;
        for (let j = 0; j <= nz; j++) {
          const z = j * dz;
          const dx = w - z;
          acc += p2[j] / Math.sqrt(dx * dx + rho * rho);
        }
        g[i] = acc * dz;
      }
      return g;
    });
  }

  // value at (w, rho); w = (front − electrode)/s
  value(w, rho) {
    const lr = Math.log(rho);
    let i0 = 0;
    const L = this.logRhos;
    if (lr <= L[0]) i0 = 0;
    else if (lr >= L[L.length - 1]) i0 = L.length - 2;
    else while (i0 < L.length - 2 && L[i0 + 1] < lr) i0++;
    const f = Math.min(1, Math.max(0, (lr - L[i0]) / (L[i0 + 1] - L[i0])));
    const u = (w - this.wMin) / this.dw;
    if (u < 0 || u >= this.nw - 1) return 0;
    const k = Math.floor(u);
    const fu = u - k;
    const a = this.data[i0];
    const b = this.data[i0 + 1];
    const va = a[k] + (a[k + 1] - a[k]) * fu;
    const vb = b[k] + (b[k + 1] - b[k]) * fu;
    return va * (1 - f) + vb * f;
  }

  // Add a single fibre's potential at one electrode: the front reaches the electrode at
  // tArrive (ms); time scale tau = s/v (ms per unit w).
  addInto(dst, tArrive, tau, rho, gain) {
    const n = dst.length;
    const tStart = tArrive + this.wMin * tau;
    const tEnd = tArrive + (this.wMin + (this.nw - 1) * this.dw) * tau;
    const i0 = Math.max(0, Math.ceil(tStart / DT));
    const i1 = Math.min(n - 1, Math.floor(tEnd / DT));
    const lr = Math.log(rho);
    const L = this.logRhos;
    let j = 0;
    if (lr >= L[L.length - 1]) j = L.length - 2;
    else while (j < L.length - 2 && L[j + 1] < lr) j++;
    const f = Math.min(1, Math.max(0, (lr - L[j]) / (L[j + 1] - L[j])));
    const A = this.data[j];
    const B = this.data[j + 1];
    for (let i = i0; i <= i1; i++) {
      const w = (i * DT - tArrive) / tau;
      const u = (w - this.wMin) / this.dw;
      const k = Math.floor(u);
      if (k < 0 || k >= this.nw - 1) continue;
      const fu = u - k;
      const va = A[k] + (A[k + 1] - A[k]) * fu;
      const vb = B[k] + (B[k + 1] - B[k]) * fu;
      dst[i] += gain * (va * (1 - f) + vb * f);
    }
  }
}

export function logspace(a, b, n) {
  const la = Math.log(a);
  const lb = Math.log(b);
  return Array.from({ length: n }, (_, i) => Math.exp(la + ((lb - la) * i) / (n - 1)));
}

export function linspace(a, b, n) {
  return Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
}
