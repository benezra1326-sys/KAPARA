/**
 * Generates the demo portraits and "moments" as illustrations, then renders
 * them to JPEG with the Chromium bundled with Playwright.
 *
 * Why illustrations: demo profiles must never use a real person's face.
 * These are faceless editorial portraits drawn from code (no model, no stock
 * photo, no licence to track), deterministic per person.
 *
 *   node apps/mobile/src/demo/art/generate.mts            # writes assets + images.ts
 *   node apps/mobile/src/demo/art/generate.mts --svg-only # writes SVGs for review
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { DEMO_PEOPLE, type DemoPerson, type MomentKind, type PortraitSpec } from '../people.ts';

const here = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(here, '../../..');
const outRoot = join(mobileRoot, 'assets/demo');

// ——— helpers ———
function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hex = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
function shade(color: string, amt: number) {
  const c = color.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
  const f = (v: number) => (amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
  return `#${hex(f(r!))}${hex(f(g!))}${hex(f(b!))}`;
}

const SKIN = ['#F4DCC8', '#EBC6A8', '#DDAE88', '#C99470', '#B07B57', '#93603F', '#74472E', '#55321F'];
const HAIR: Record<PortraitSpec['hairColor'], string> = {
  black: '#1D1714', darkBrown: '#3A281E', brown: '#5E4130', auburn: '#7C3A22', blond: '#C9A366', grey: '#9A958D', white: '#DCD7CF',
};

const grain = `
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" result="n"/>
    <feColorMatrix type="saturate" values="0"/>
    <feComponentTransfer><feFuncA type="table" tableValues="0 0.10"/></feComponentTransfer>
    <feBlend in2="SourceGraphic" mode="overlay"/>
  </filter>
  <filter id="soft"><feGaussianBlur stdDeviation="28"/></filter>
  <filter id="blur8"><feGaussianBlur stdDeviation="8"/></filter>`;

const vignette = (w: number, h: number) => `
  <radialGradient id="vig" cx="50%" cy="45%" r="75%"><stop offset="60%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.35"/></radialGradient>
  <rect width="${w}" height="${h}" fill="url(#vig)"/>`;

const wrap = (w: number, h: number, defs: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${grain}${defs}</defs>` +
  `<g filter="url(#grain)">${body}<rect width="${w}" height="${h}" fill="transparent"/></g>${vignette(w, h)}</svg>`;

// ——— portrait ———
const SCENES: Record<PortraitSpec['scene'], { top: string; bottom: string; lights: string[] }> = {
  candlelight: { top: '#2B1B16', bottom: '#5C3021', lights: ['#F4B860', '#E98A4A', '#FFD79A'] },
  dusk: { top: '#F3C3A5', bottom: '#5A4468', lights: ['#FFE0B8', '#E88E8E'] },
  garden: { top: '#E3EAD0', bottom: '#7E9B7C', lights: ['#B9CFA0', '#F6F1D4', '#8EAE86'] },
  sea: { top: '#CFE6EE', bottom: '#F2E4D2', lights: ['#FFFFFF'] },
  studio: { top: '#F1E8DC', bottom: '#D2BEA6', lights: ['#FFF6EA'] },
  library: { top: '#3A2E2A', bottom: '#6A4E3A', lights: ['#E9C58E'] },
  terrace: { top: '#F8E4C6', bottom: '#DD9F6B', lights: ['#FFF1D6', '#F6C58F'] },
  night: { top: '#141A2E', bottom: '#33395E', lights: ['#F7C873', '#E77A8F', '#9BD0F0'] },
};

function background(spec: PortraitSpec, r: () => number, W: number, H: number) {
  const sc = SCENES[spec.scene];
  let s = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  if (spec.scene === 'sea') {
    s += `<rect y="${H * 0.62}" width="${W}" height="${H * 0.38}" fill="#3F7D95"/>`;
    for (let i = 0; i < 9; i++) s += `<rect y="${H * 0.63 + i * 26}" x="${r() * W * 0.6}" width="${120 + r() * 300}" height="3" fill="#fff" opacity="0.18"/>`;
    s += `<circle cx="${W * 0.78}" cy="${H * 0.2}" r="70" fill="#FFF4DE" opacity="0.9"/>`;
  } else if (spec.scene === 'library') {
    const cols = ['#7B3F2E', '#2F4858', '#8C6A3F', '#4E5B3A', '#6D3B47', '#B08850'];
    for (let row = 0; row < 3; row++) {
      let x = 0;
      const y = 120 + row * 300;
      while (x < W) {
        const w = 26 + r() * 34;
        const h = 190 + r() * 70;
        s += `<rect x="${x}" y="${y + (260 - h)}" width="${w - 4}" height="${h}" rx="3" fill="${cols[Math.floor(r() * cols.length)]}" opacity="0.75"/>`;
        x += w;
      }
      s += `<rect x="0" y="${y + 260}" width="${W}" height="16" fill="#2A201C" opacity="0.8"/>`;
    }
  } else if (spec.scene === 'terrace') {
    for (let i = 0; i < 9; i++) s += `<rect x="${i * 110 - 20}" y="0" width="55" height="150" fill="#FFF8EE" opacity="0.55"/>`;
    s += `<path d="M0 150 Q 55 190 110 150 T 220 150 T 330 150 T 440 150 T 550 150 T 660 150 T 770 150 T 880 150 T 990 150 V 0 H 0 Z" fill="#B23A48" opacity="0.18"/>`;
  } else if (spec.scene === 'garden') {
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y = r() * H * 0.75, rx = 30 + r() * 70;
      s += `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${rx * 0.45}" transform="rotate(${r() * 180} ${x} ${y})" fill="${sc.lights[i % sc.lights.length]}" opacity="${0.35 + r() * 0.35}"/>`;
    }
  }
  const bokeh = spec.scene === 'night' || spec.scene === 'candlelight' ? 22 : 7;
  for (let i = 0; i < bokeh; i++) {
    const rad = spec.scene === 'night' || spec.scene === 'candlelight' ? 10 + r() * 34 : 60 + r() * 140;
    s += `<circle cx="${r() * W}" cy="${r() * H * 0.7}" r="${rad}" fill="${sc.lights[i % sc.lights.length]}" opacity="${0.12 + r() * 0.3}" filter="url(#${rad > 40 ? 'soft' : 'blur8'})"/>`;
  }
  return s;
}

function hairBack(spec: PortraitSpec, hx: number, c: string, r: () => number) {
  switch (spec.hair) {
    case 'long':
      return `<path d="M${hx - 165} 600 C ${hx - 200} 380 ${hx + 200} 380 ${hx + 165} 600 C ${hx + 185} 760 ${hx + 200} 900 ${hx + 190} 1000 L ${hx - 190} 1000 C ${hx - 200} 900 ${hx - 185} 760 ${hx - 165} 600 Z" fill="${c}"/>`;
    case 'wavy':
      return `<path d="M${hx - 170} 600 C ${hx - 205} 390 ${hx + 205} 390 ${hx + 170} 600 C ${hx + 210} 680 ${hx + 160} 740 ${hx + 195} 820 C ${hx + 150} 860 ${hx + 90} 850 ${hx + 60} 830 L ${hx - 60} 830 C ${hx - 90} 850 ${hx - 150} 860 ${hx - 195} 820 C ${hx - 160} 740 ${hx - 210} 680 ${hx - 170} 600 Z" fill="${c}"/>`;
    case 'bob':
      return `<path d="M${hx - 168} 610 C ${hx - 195} 380 ${hx + 195} 380 ${hx + 168} 610 C ${hx + 172} 680 ${hx + 170} 720 ${hx + 160} 745 L ${hx - 160} 745 C ${hx - 170} 720 ${hx - 172} 680 ${hx - 168} 610 Z" fill="${c}"/>`;
    case 'curly':
    case 'coils': {
      const big = spec.hair === 'curly';
      let s = '';
      const n = big ? 26 : 34;
      for (let i = 0; i < n; i++) {
        const a = Math.PI * (1.05 + (i / (n - 1)) * 0.9) + (r() - 0.5) * 0.1;
        const rad = big ? 150 + r() * 25 : 128 + r() * 12;
        const cr = big ? 42 + r() * 20 : 26 + r() * 8;
        s += `<circle cx="${hx + Math.cos(a) * rad}" cy="${600 + Math.sin(a) * rad * 1.05}" r="${cr}" fill="${i % 3 ? c : shade(c, 0.08)}"/>`;
      }
      if (big) for (let i = 0; i < 10; i++) {
        const side = i % 2 ? 1 : -1;
        s += `<circle cx="${hx + side * (140 + r() * 30)}" cy="${620 + r() * 150}" r="${36 + r() * 16}" fill="${c}"/>`;
      }
      return s;
    }
    case 'ponytail':
      return `<path d="M${hx + 110} 520 C ${hx + 230} 540 ${hx + 220} 760 ${hx + 170} 860 C ${hx + 150} 760 ${hx + 150} 640 ${hx + 90} 560 Z" fill="${c}"/>`;
    default:
      return '';
  }
}

function hairFront(spec: PortraitSpec, hx: number, c: string) {
  const hi = shade(c, 0.18);
  const cap = (hairline: number, part = 0) =>
    `<path d="M${hx - 138} 640 C ${hx - 152} 425 ${hx - 60} 400 ${hx} 404 C ${hx + 80} 400 ${hx + 156} 440 ${hx + 138} 640 C ${hx + 122} 560 ${hx + 100} ${hairline + 15} ${hx + 40 + part} ${hairline} C ${hx - 20} ${hairline - 8} ${hx - 92} ${hairline + 20} ${hx - 138} 640 Z" fill="${c}"/>` +
    `<path d="M${hx - 70} 430 C ${hx - 20} 412 ${hx + 40} 415 ${hx + 80} 435" stroke="${hi}" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.45"/>`;
  switch (spec.hair) {
    case 'short': return cap(500);
    case 'buzz': return `<g opacity="0.9">${cap(470)}</g>`;
    case 'long': case 'wavy': return cap(495, -40);
    case 'bob': return cap(520, 30);
    case 'bun': return cap(480) + `<circle cx="${hx + 10}" cy="400" r="62" fill="${c}"/><circle cx="${hx - 5}" cy="385" r="18" fill="${hi}" opacity="0.35"/>`;
    case 'ponytail': return cap(482, -20);
    case 'curly': return cap(470);
    case 'coils': return `<g opacity="0.95">${cap(468)}</g>`;
  }
}

export function portraitSvg(p: DemoPerson) {
  const spec = p.portrait;
  const r = rng(p.key);
  const W = 900, H = 1200;
  const sc = SCENES[spec.scene];
  const cx = 450 + (spec.lean ?? 0) * 70;
  const hx = cx + (spec.lean ?? 0) * 25;
  const skin = SKIN[spec.skin]!;
  const hair = HAIR[spec.hairColor];
  const outfit = spec.outfit;
  const defs = `
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sc.top}"/><stop offset="1" stop-color="${sc.bottom}"/></linearGradient>
    <radialGradient id="skin" cx="38%" cy="35%" r="75%"><stop offset="0" stop-color="${shade(skin, 0.14)}"/><stop offset="0.6" stop-color="${skin}"/><stop offset="1" stop-color="${shade(skin, -0.22)}"/></radialGradient>
    <linearGradient id="neck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(skin, -0.28)}"/><stop offset="0.5" stop-color="${shade(skin, -0.08)}"/></linearGradient>
    <linearGradient id="cloth" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${shade(outfit, 0.15)}"/><stop offset="1" stop-color="${shade(outfit, -0.3)}"/></linearGradient>
    <linearGradient id="light" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#FFF6E5" stop-opacity="0.18"/><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></linearGradient>`;
  const body =
    background(spec, r, W, H) +
    `<g transform="translate(${cx} ${H}) scale(1.32) translate(${-cx} ${-H})">` +
    hairBack(spec, hx, hair, r) +
    // neck
    `<path d="M${cx - 58} 700 L ${cx + 58} 700 L ${cx + 66} 900 L ${cx - 66} 900 Z" fill="url(#neck)"/>` +
    // ears
    `<ellipse cx="${hx - 126}" cy="625" rx="22" ry="38" fill="${shade(skin, -0.1)}"/><ellipse cx="${hx + 126}" cy="625" rx="22" ry="38" fill="${shade(skin, -0.15)}"/>` +
    (spec.earrings ? `<circle cx="${hx - 128}" cy="672" r="9" fill="#C9A15C"/><circle cx="${hx + 128}" cy="672" r="9" fill="#B88B4A"/>` : '') +
    // head
    `<ellipse cx="${hx}" cy="600" rx="128" ry="160" fill="url(#skin)"/>` +
    `<ellipse cx="${hx - 58}" cy="660" rx="34" ry="20" fill="#E07A6A" opacity="0.06"/><ellipse cx="${hx + 58}" cy="660" rx="34" ry="20" fill="#E07A6A" opacity="0.06"/>` +
    `<ellipse cx="${hx + 8}" cy="652" rx="10" ry="26" fill="${shade(skin, -0.3)}" opacity="0.14" filter="url(#blur8)"/>` +
    (spec.beard ? `<path d="M${hx - 118} 630 C ${hx - 112} 760 ${hx - 50} 792 ${hx} 796 C ${hx + 50} 792 ${hx + 112} 760 ${hx + 118} 630 C ${hx + 92} 696 ${hx + 52} 716 ${hx} 718 C ${hx - 52} 716 ${hx - 92} 696 ${hx - 118} 630 Z" fill="${hair}" opacity="0.92"/>` : '') +
    hairFront(spec, hx, hair) +
    (spec.glasses ? `<g fill="none" stroke="#211B1A" stroke-width="6" opacity="0.9"><rect x="${hx - 98}" y="568" width="76" height="54" rx="20"/><rect x="${hx + 22}" y="568" width="76" height="54" rx="20"/><path d="M${hx - 22} 588 Q ${hx} 578 ${hx + 22} 588"/></g>` : '') +
    // shoulders with a soft neckline
    `<path d="M${cx - 340} ${H} C ${cx - 330} 1010 ${cx - 290} 905 ${cx - 190} 868 C ${cx - 150} 852 ${cx - 110} 846 ${cx - 78} 842 Q ${cx} 940 ${cx + 78} 842 C ${cx + 110} 846 ${cx + 150} 852 ${cx + 190} 868 C ${cx + 290} 905 ${cx + 330} 1010 ${cx + 340} ${H} Z" fill="url(#cloth)"/>` +
    `<path d="M${cx - 78} 842 Q ${cx} 940 ${cx + 78} 842" stroke="${shade(outfit, 0.3)}" stroke-width="6" fill="none" opacity="0.6"/>` +
    `</g><rect width="${W}" height="${H}" fill="url(#light)"/>`;
  return wrap(W, H, defs, body);
}

// ——— moments (4:5) ———
type MomentFn = (r: () => number, accent: string, W: number, H: number) => string;
const M: Record<MomentKind, MomentFn> = {
  candles: (r, a, W, H) => {
    let s = `<rect width="${W}" height="${H}" fill="#24160F"/><rect y="${H * 0.72}" width="${W}" height="${H * 0.28}" fill="#3B241A"/>`;
    for (const x of [W * 0.38, W * 0.62]) {
      s += `<circle cx="${x}" cy="${H * 0.3}" r="180" fill="#F4B860" opacity="0.22" filter="url(#soft)"/>`;
      s += `<rect x="${x - 26}" y="${H * 0.36}" width="52" height="${H * 0.36}" rx="6" fill="#F5EDE0"/><rect x="${x - 26}" y="${H * 0.36}" width="14" height="${H * 0.36}" fill="#fff" opacity="0.4"/>`;
      s += `<rect x="${x - 60}" y="${H * 0.7}" width="120" height="30" rx="10" fill="${shade(a, -0.2)}"/>`;
      s += `<path d="M${x} ${H * 0.26} C ${x + 24} ${H * 0.31} ${x + 16} ${H * 0.35} ${x} ${H * 0.355} C ${x - 16} ${H * 0.35} ${x - 24} ${H * 0.31} ${x} ${H * 0.26} Z" fill="#FFD27A"/><ellipse cx="${x}" cy="${H * 0.335}" rx="7" ry="14" fill="#FFF6DA"/>`;
    }
    for (let i = 0; i < 14; i++) s += `<circle cx="${r() * W}" cy="${r() * H * 0.6}" r="${8 + r() * 22}" fill="#F7C873" opacity="${0.08 + r() * 0.18}" filter="url(#blur8)"/>`;
    return s;
  },
  coffee: (r, a, W, H) => {
    const cx = W * 0.5, cy = H * 0.52;
    return `<rect width="${W}" height="${H}" fill="${shade(a, 0.55)}"/>` +
      `<rect x="${W * 0.08}" y="${H * 0.1}" width="${W * 0.36}" height="${H * 0.46}" rx="8" fill="#FBF7F1" transform="rotate(-8 ${W * 0.26} ${H * 0.33})" opacity="0.9"/>` +
      Array.from({ length: 9 }, (_, i) => `<rect x="${W * 0.12}" y="${H * 0.15 + i * 38}" width="${W * (0.18 + r() * 0.1)}" height="6" rx="3" fill="#8C8496" opacity="0.5" transform="rotate(-8 ${W * 0.26} ${H * 0.33})"/>`).join('') +
      `<ellipse cx="${cx + 20}" cy="${cy + 30}" rx="230" ry="230" fill="#000" opacity="0.12" filter="url(#blur8)"/>` +
      `<circle cx="${cx}" cy="${cy}" r="225" fill="#F6F1EA"/><circle cx="${cx}" cy="${cy}" r="140" fill="#FFFFFF"/>` +
      `<circle cx="${cx}" cy="${cy}" r="112" fill="#4A2C1D"/><circle cx="${cx - 10}" cy="${cy - 8}" r="80" fill="#B9845A" opacity="0.65"/>` +
      `<path d="M${cx + 138} ${cy - 20} C ${cx + 200} ${cy - 30} ${cx + 205} ${cy + 40} ${cx + 138} ${cy + 30}" stroke="#F6F1EA" stroke-width="22" fill="none"/>`;
  },
  sea: (r, a, W, H) => {
    let s = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D7B8"/><stop offset="1" stop-color="#F3B79A"/></linearGradient>` +
      `<rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="${W * 0.62}" cy="${H * 0.46}" r="90" fill="#FFF0D8"/>` +
      `<rect y="${H * 0.5}" width="${W}" height="${H * 0.5}" fill="#3D6E86"/>`;
    for (let i = 0; i < 28; i++) s += `<rect x="${r() * W}" y="${H * 0.51 + r() * H * 0.45}" width="${40 + r() * 180}" height="4" rx="2" fill="#FFE7C7" opacity="${0.12 + r() * 0.3}"/>`;
    return s + `<rect y="${H * 0.86}" width="${W}" height="${H * 0.14}" fill="#E9D3B5"/>`;
  },
  rooftops: (r, a, W, H) => {
    let s = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3B3F68"/><stop offset="1" stop-color="#E8A38A"/></linearGradient><rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="${W * 0.78}" cy="${H * 0.18}" r="40" fill="#FFF3DA" opacity="0.9"/>`;
    for (let row = 0; row < 3; row++) {
      const base = H * (0.55 + row * 0.15);
      const col = ['#6E7894', '#4D5573', '#2E334A'][row]!;
      let x = -40;
      while (x < W) {
        const w = 120 + r() * 120, h = 60 + r() * 80;
        s += `<path d="M${x} ${base} L ${x + 20} ${base - h} L ${x + w - 20} ${base - h} L ${x + w} ${base} Z" fill="${col}"/>`;
        s += `<rect x="${x + w * 0.3}" y="${base - h - 40}" width="22" height="44" fill="${shade(col, -0.2)}"/>`;
        if (r() > 0.5) s += `<rect x="${x + w * 0.55}" y="${base - h * 0.6}" width="20" height="26" fill="#F7C873" opacity="0.8"/>`;
        x += w - 10;
      }
      s += `<rect y="${base}" width="${W}" height="${H * 0.16}" fill="${shade(col, -0.25)}"/>`;
    }
    return s;
  },
  books: (r, a, W, H) => {
    let s = `<rect width="${W}" height="${H}" fill="${shade(a, 0.7)}"/><rect y="${H * 0.78}" width="${W}" height="${H * 0.22}" fill="${shade(a, -0.15)}"/>`;
    const cols = [a, '#2F4858', '#B88B4A', '#5F7A61', '#B23A48', '#E7DCCD', '#1E1A24'];
    let y = H * 0.78;
    for (let i = 0; i < 9; i++) {
      const w = W * (0.38 + r() * 0.2), h = 34 + r() * 30, x = W * 0.5 - w / 2 + (r() - 0.5) * 50;
      y -= h;
      s += `<rect x="${x}" y="${y}" width="${w}" height="${h - 3}" rx="4" fill="${cols[i % cols.length]}"/><rect x="${x + 16}" y="${y + h / 2 - 4}" width="${w * 0.3}" height="5" fill="#fff" opacity="0.35"/>`;
    }
    return s + `<path d="M${W * 0.8} ${H * 0.78} C ${W * 0.78} ${H * 0.6} ${W * 0.86} ${H * 0.5} ${W * 0.9} ${H * 0.42}" stroke="#5F7A61" stroke-width="10" fill="none"/><ellipse cx="${W * 0.88}" cy="${H * 0.5}" rx="46" ry="20" fill="#7E9B7C" transform="rotate(-40 ${W * 0.88} ${H * 0.5})"/>`;
  },
  flowers: (r, a, W, H) => {
    let s = `<rect width="${W}" height="${H}" fill="#F2EAE0"/><rect y="${H * 0.82}" width="${W}" height="${H * 0.18}" fill="#E1D3BF"/>`;
    const vx = W / 2;
    for (let i = 0; i < 9; i++) {
      const tx = vx + (r() - 0.5) * 520, ty = H * (0.18 + r() * 0.3);
      s += `<path d="M${vx + (r() - 0.5) * 30} ${H * 0.62} Q ${vx + (tx - vx) * 0.3} ${H * 0.45} ${tx} ${ty}" stroke="#5F7A61" stroke-width="7" fill="none"/>`;
      const col = [a, '#B23A48', '#F4D9D6', '#E9C46A', '#FBF7F1'][i % 5]!;
      for (let k = 0; k < 6; k++) s += `<circle cx="${tx + Math.cos(k) * 34}" cy="${ty + Math.sin(k) * 34}" r="30" fill="${col}" opacity="0.92"/>`;
      s += `<circle cx="${tx}" cy="${ty}" r="18" fill="${shade(col, -0.35)}"/>`;
    }
    return s + `<path d="M${vx - 120} ${H * 0.58} L ${vx + 120} ${H * 0.58} L ${vx + 90} ${H * 0.84} L ${vx - 90} ${H * 0.84} Z" fill="${shade(a, -0.1)}"/><rect x="${vx - 120}" y="${H * 0.58}" width="240" height="16" fill="${shade(a, 0.2)}"/>`;
  },
  ceramics: (r, a, W, H) => {
    let s = `<rect width="${W}" height="${H}" fill="#E7DCCD"/><rect y="${H * 0.66}" width="${W}" height="${H * 0.34}" fill="#CDB89D"/>`;
    const glazes = [a, '#F5EFE8', '#5F7A61', '#B88B4A'];
    [[0.3, 0.66, 150], [0.68, 0.66, 120], [0.5, 0.46, 110]].forEach(([fx, fy, rw], i) => {
      const x = W * fx!, y = H * fy!;
      s += `<path d="M${x - rw!} ${y - 120} Q ${x - rw!} ${y} ${x} ${y} Q ${x + rw!} ${y} ${x + rw!} ${y - 120} Z" fill="${glazes[i % glazes.length]}"/><ellipse cx="${x}" cy="${y - 120}" rx="${rw}" ry="26" fill="${shade(glazes[i % glazes.length]!, -0.25)}"/>`;
      s += `<path d="M${x - rw! * 0.7} ${y - 70} Q ${x} ${y - 40} ${x + rw! * 0.7} ${y - 70}" stroke="#fff" stroke-width="6" fill="none" opacity="${0.3 + r() * 0.3}"/>`;
    });
    return s;
  },
  vinyl: (r, a, W, H) => {
    const cx = W * 0.56, cy = H * 0.5;
    let s = `<rect width="${W}" height="${H}" fill="${shade(a, 0.6)}"/><rect x="${W * 0.08}" y="${H * 0.2}" width="${W * 0.52}" height="${W * 0.52}" fill="${a}"/><circle cx="${W * 0.34}" cy="${H * 0.2 + W * 0.26}" r="${W * 0.16}" fill="${shade(a, 0.35)}" opacity="0.6"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${W * 0.3}" fill="#151215"/>`;
    for (let i = 0; i < 16; i++) s += `<circle cx="${cx}" cy="${cy}" r="${W * (0.12 + i * 0.011)}" fill="none" stroke="#2C272C" stroke-width="2"/>`;
    return s + `<path d="M${cx - W * 0.25} ${cy - W * 0.12} A ${W * 0.28} ${W * 0.28} 0 0 1 ${cx - W * 0.05} ${cy - W * 0.28}" stroke="#fff" stroke-width="10" opacity="0.12" fill="none"/><circle cx="${cx}" cy="${cy}" r="${W * 0.1}" fill="#B23A48"/><circle cx="${cx}" cy="${cy}" r="10" fill="#151215"/>`;
  },
  bread: (r, a, W, H) => {
    let s = `<rect width="${W}" height="${H}" fill="#EFE3D1"/><rect x="${W * 0.08}" y="${H * 0.3}" width="${W * 0.84}" height="${H * 0.44}" rx="40" fill="#B88B5A"/><rect x="${W * 0.08}" y="${H * 0.3}" width="${W * 0.84}" height="20" rx="10" fill="#C99C6B"/>`;
    for (let i = 0; i < 6; i++) {
      const x = W * (0.22 + i * 0.11), y = H * 0.52 + (i % 2 ? -26 : 26);
      s += `<ellipse cx="${x}" cy="${y}" rx="78" ry="60" fill="#B5652B" transform="rotate(${i % 2 ? 25 : -25} ${x} ${y})"/><ellipse cx="${x - 10}" cy="${y - 16}" rx="42" ry="22" fill="#E0A562" opacity="0.6" transform="rotate(${i % 2 ? 25 : -25} ${x} ${y})"/>`;
    }
    for (let i = 0; i < 60; i++) s += `<ellipse cx="${W * 0.2 + r() * W * 0.6}" cy="${H * 0.45 + r() * H * 0.14}" rx="4" ry="2" fill="#F8EBD0" opacity="0.8"/>`;
    return s;
  },
  boat: (r, a, W, H) => {
    let s = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFDDE8"/><stop offset="1" stop-color="#F3E6D3"/></linearGradient><rect width="${W}" height="${H}" fill="url(#sky)"/><rect y="${H * 0.62}" width="${W}" height="${H * 0.38}" fill="#2F6680"/>`;
    s += `<path d="M${W * 0.5} ${H * 0.18} L ${W * 0.5} ${H * 0.6} L ${W * 0.75} ${H * 0.6} Z" fill="#FBF7F1"/><path d="M${W * 0.48} ${H * 0.24} L ${W * 0.48} ${H * 0.6} L ${W * 0.3} ${H * 0.6} Z" fill="${shade(a, 0.4)}"/>`;
    s += `<path d="M${W * 0.24} ${H * 0.61} L ${W * 0.8} ${H * 0.61} L ${W * 0.72} ${H * 0.67} L ${W * 0.3} ${H * 0.67} Z" fill="#7B3F2E"/>`;
    for (let i = 0; i < 20; i++) s += `<rect x="${r() * W}" y="${H * 0.68 + r() * H * 0.3}" width="${40 + r() * 140}" height="4" rx="2" fill="#fff" opacity="${0.12 + r() * 0.25}"/>`;
    return s;
  },
  mountains: (r, a, W, H) => {
    let s = `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4D9C6"/><stop offset="1" stop-color="#FBF1E6"/></linearGradient><rect width="${W}" height="${H}" fill="url(#sky)"/><circle cx="${W * 0.3}" cy="${H * 0.22}" r="60" fill="#F6B98C" opacity="0.8"/>`;
    ['#9AA7B8', '#6C7D8F', '#45586B', '#2B3A45'].forEach((col, i) => {
      let d = `M0 ${H}`;
      const base = H * (0.42 + i * 0.12);
      for (let x = 0; x <= W; x += W / 6) d += ` L ${x} ${base - r() * 160}`;
      s += `<path d="${d} L ${W} ${H} Z" fill="${col}"/>`;
    });
    return s;
  },
  citrus: (r, a, W, H) => {
    let s = `<rect width="${W}" height="${H}" fill="${shade(a, 0.5)}"/><circle cx="${W / 2}" cy="${H / 2}" r="${W * 0.4}" fill="#FBF7F1"/><circle cx="${W / 2}" cy="${H / 2}" r="${W * 0.34}" fill="none" stroke="#E7DCCD" stroke-width="6"/>`;
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2 + r();
      const x = W / 2 + Math.cos(ang) * W * 0.2, y = H / 2 + Math.sin(ang) * W * 0.2;
      const col = i % 3 === 0 ? '#E9C46A' : '#F08A3C';
      s += `<circle cx="${x}" cy="${y}" r="70" fill="${col}"/><circle cx="${x}" cy="${y}" r="58" fill="${shade(col, 0.3)}"/>`;
      for (let k = 0; k < 8; k++) s += `<line x1="${x}" y1="${y}" x2="${x + Math.cos((k / 8) * Math.PI * 2) * 56}" y2="${y + Math.sin((k / 8) * Math.PI * 2) * 56}" stroke="${col}" stroke-width="3"/>`;
    }
    return s + `<ellipse cx="${W * 0.5}" cy="${H * 0.5}" rx="30" ry="12" fill="#5F7A61"/>`;
  },
};

export function momentSvg(p: DemoPerson, i: number) {
  const W = 960, H = 1200;
  const m = p.moments[i]!;
  return wrap(W, H, '', M[m.kind](rng(`${p.key}-${i}`), p.portrait.outfit, W, H));
}

// ——— render ———
async function main() {
  const svgOnly = process.argv.includes('--svg-only');
  const jobs: { file: string; svg: string; w: number; h: number }[] = [];
  for (const p of DEMO_PEOPLE) {
    jobs.push({ file: `portraits/${p.key}.jpg`, svg: portraitSvg(p), w: 900, h: 1200 });
    p.moments.forEach((_, i) => jobs.push({ file: `moments/${p.key}-${i}.jpg`, svg: momentSvg(p, i), w: 960, h: 1200 }));
  }
  for (const d of ['portraits', 'moments']) mkdirSync(join(outRoot, d), { recursive: true });
  if (svgOnly) {
    for (const j of jobs) writeFileSync(join(outRoot, j.file.replace('.jpg', '.svg')), j.svg);
    return;
  }
  const require = createRequire(import.meta.url);
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 0.8 });
  for (const j of jobs) {
    await page.setViewportSize({ width: j.w, height: j.h });
    await page.setContent(`<html><body style="margin:0">${j.svg}</body></html>`);
    await page.screenshot({ path: join(outRoot, j.file), type: 'jpeg', quality: 80, clip: { x: 0, y: 0, width: j.w, height: j.h } });
  }
  await browser.close();

  // Static require map for Metro (it cannot resolve dynamic requires).
  const lines = jobs.map((j) => `  '${j.file}': require('../../assets/demo/${j.file}'),`);
  writeFileSync(join(mobileRoot, 'src/demo/images.generated.ts'),
    `// Generated by src/demo/art/generate.mts — do not edit.\n/* eslint-disable */\nexport const DEMO_IMAGES: Record<string, number> = {\n${lines.join('\n')}\n};\n`);
  console.log(`rendered ${jobs.length} images into ${outRoot}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
