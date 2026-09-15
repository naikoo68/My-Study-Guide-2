// Shared visual-fidelity helpers for the pure-SVG visualization renderers
// (SciRenderer, IllustrationRenderer, …). These lift the output from flat,
// schematic vector art toward a richer "3D-ish" look — WITHOUT changing the
// architecture: everything is still declarative SVG, so it stays editable,
// dark-mode friendly, and exportable through the existing SVG/PNG exporters.
//
// What this gives you:
//   • PALETTE   — the shared colour ramp (kept vivid + white-text safe).
//   • <VizDefs> — reusable <defs> (drop him inside a renderer's own <defs>):
//       - #viz-gloss   a top-left white highlight (makes circles look glossy)
//       - #viz-shade   a soft rim-darkening (gives circles roundness/volume)
//       - #viz-shadow  a soft drop shadow for solid shapes
//   • <Sphere>  — a drop-in replacement for a flat <circle> that renders it as
//                 a shaded 3D ball (base fill + rim shade + gloss + optional
//                 stroke), working for ANY fill colour.

import { Fragment } from "react";

// Vivid, evenly-spaced hues (Tailwind 500s). Chosen so white labels drawn on
// top stay legible. Centralised here so every renderer shares one ramp.
export const PALETTE = [
  "#2563eb", // blue
  "#ef4444", // red
  "#10b981", // emerald
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

// Reusable gradient + filter definitions. Ids are stable ("viz-*"); because
// each renderer draws its own <svg>, duplicate ids across svgs are harmless
// (they resolve to identical definitions).
export function VizDefs() {
  return (
    <Fragment>
      {/* Top-left specular highlight — turns a flat disc into a shiny ball. */}
      <radialGradient id="viz-gloss" cx="50%" cy="50%" r="62%" fx="32%" fy="28%">
        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
        <stop offset="38%" stopColor="#ffffff" stopOpacity="0.18" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
      {/* Rim darkening — gives roundness/volume regardless of the base colour. */}
      <radialGradient id="viz-shade" cx="50%" cy="50%" r="52%">
        <stop offset="58%" stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.30" />
      </radialGradient>
      {/* Soft drop shadow for solid shapes (boxes, bodies, membranes). */}
      <filter id="viz-shadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.28" />
      </filter>
    </Fragment>
  );
}

// A shaded sphere: drop-in for a flat <circle>. Layers base fill → rim shade →
// specular gloss → optional stroke. Any label should be drawn AFTER a <Sphere>
// so it sits on top of the gloss and stays readable.
export function Sphere({ cx, cy, r, fill, stroke, strokeWidth = 0, opacity }) {
  return (
    <g opacity={opacity}>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx} cy={cy} r={r} fill="url(#viz-shade)" />
      <circle cx={cx} cy={cy} r={r} fill="url(#viz-gloss)" />
      {strokeWidth > 0 && <circle cx={cx} cy={cy} r={r} fill="none" stroke={stroke} strokeWidth={strokeWidth} />}
    </g>
  );
}
