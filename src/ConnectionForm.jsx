import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "./context/AuthContext";

/* ─────────────────────────────────────────────────────────────
   DATA CONSTANTS
───────────────────────────────────────────────────────────── */
const CLT_SPECIES = [
  { name: "CLT – Cypress Standard (C24)", density: 420 },
  { name: "CLT – Softwood Laminated (C18)", density: 450 },
  { name: "CLT – Nordic Spruce (C30)", density: 380 },
];
const BEAM_SPECIES = [
  { name: "Hardwood (D40)", density: 550 },
  { name: "Engineered GlueLam GL24h", density: 480 },
  { name: "Softwood (C24)", density: 450 },
  { name: "LVL – Laminated Veneer Lumber", density: 510 },
];
const DEFAULTS = {
  slabThickness: 140,
  beamThickness: 160,
  beamWidth: 200,
  screwDiameter: 8,
  screwLength: 220,
  slabDensity: 420,
  beamDensity: 480,
  shearLoad: 25.0,
  member2Type: "Beam",
  connectionWidth: 300,
  connectionLength: 400,
};

const API_URL =
  "https://vy7c0oz1s1.execute-api.us-east-1.amazonaws.com/calculate";

/* ─────────────────────────────────────────────────────────────
   ENGINEERING LOGIC
───────────────────────────────────────────────────────────── */
function getPenetrationStatus(l, t1, t2, d) {
  if (!l || !t1 || !t2 || !d) return null;
  const minPen = Math.max(4 * d, 40);
  const pen = l - t1;
  if (l > t1 + t2)
    return {
      type: "error",
      icon: "🚫",
      title: "Over-penetration",
      detail: `Screw (${l}mm) exceeds t1+t2 (${t1 + t2}mm). Tip protrudes from Member 2.`,
    };
  if (pen <= 0)
    return {
      type: "error",
      icon: "❌",
      title: "No penetration into Member 2",
      detail: `Screw (${l}mm) ≤ t1 (${t1}mm). Fastener does not reach Member 2.`,
    };
  if (pen < minPen)
    return {
      type: "caution",
      icon: "⚠️",
      title: "Insufficient EC5 penetration",
      detail: `Penetration = ${pen.toFixed(0)}mm; EC5 requires ≥ ${minPen.toFixed(0)}mm (max of 4d=${4 * d}mm, 40mm).`,
    };
  return {
    type: "ok",
    icon: "✅",
    title: "Penetration compliant",
    detail: `Penetrates ${pen.toFixed(0)}mm into Member 2 — meets EC5 §8.7.2 minimum of ${minPen.toFixed(0)}mm.`,
  };
}

/* ─────────────────────────────────────────────────────────────
   STYLES (CSS-in-JS theme system)
───────────────────────────────────────────────────────────── */
const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;700&family=Lato:wght@300;400;700&display=swap');`;

function getTheme(dark) {
  return {
    bg: dark ? "#080c12" : "#f0f2f5",
    surface: dark ? "#0f1620" : "#ffffff",
    surface2: dark ? "#141e2e" : "#f7f8fa",
    border: dark ? "#1e2d42" : "#dde2ea",
    borderAlt: dark ? "#253450" : "#c8d0dc",
    text: dark ? "#e8edf5" : "#0d1829",
    textMuted: dark ? "#5a7090" : "#6b7a92",
    textDim: dark ? "#3a5070" : "#9aa3b0",
    accent: "#1a6fff",
    accentGlow: dark ? "rgba(26,111,255,0.15)" : "rgba(26,111,255,0.08)",
    green: "#00c47a",
    amber: "#f5a623",
    red: "#f5415a",
    greenBg: dark ? "rgba(0,196,122,0.08)" : "rgba(0,196,122,0.07)",
    amberBg: dark ? "rgba(245,166,35,0.08)" : "rgba(245,166,35,0.07)",
    redBg: dark ? "rgba(245,65,90,0.08)" : "rgba(245,65,90,0.06)",
    shadow: dark
      ? "0 4px 24px rgba(0,0,0,0.5)"
      : "0 4px 24px rgba(13,24,41,0.08)",
    shadowSm: dark
      ? "0 2px 8px rgba(0,0,0,0.4)"
      : "0 2px 8px rgba(13,24,41,0.06)",
    logBg: "#05090f",
  };
}

/* ─────────────────────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────────────────────── */
function Tooltip({ tip, children }) {
  const [vis, setVis] = useState(false);
  return (
    <span
      style={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      {children}
      <span
        onMouseEnter={() => setVis(true)}
        onMouseLeave={() => setVis(false)}
        style={{
          width: 15,
          height: 15,
          borderRadius: "50%",
          background: "#1e3050",
          color: "#5a8adb",
          fontSize: 9,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "help",
          fontWeight: 700,
          fontFamily: "Lato, sans-serif",
          flexShrink: 0,
          border: "1px solid #2a4060",
        }}
      >
        ?
      </span>
      {vis && (
        <span
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#0d1829",
            color: "#b0c4e0",
            fontSize: 11,
            padding: "8px 12px",
            borderRadius: 8,
            whiteSpace: "normal",
            zIndex: 999,
            pointerEvents: "none",
            maxWidth: 240,
            lineHeight: 1.5,
            border: "1px solid #1e3050",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            fontFamily: "Lato, sans-serif",
          }}
        >
          {tip}
        </span>
      )}
    </span>
  );
}

function Badge({ children, color = "#1a6fff" }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 20,
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: "0.5px",
        background: color + "22",
        color,
        border: `1px solid ${color}44`,
        fontFamily: "JetBrains Mono, monospace",
        textTransform: "uppercase",
      }}
    >
      {children}
    </span>
  );
}

function Section({ title, badge, children, theme }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          padding: "4px 0",
          userSelect: "none",
          marginBottom: open ? 12 : 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: theme.textMuted,
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            {title}
          </span>
          {badge && <Badge>{badge}</Badge>}
        </div>
        <span
          style={{
            color: theme.textDim,
            fontSize: 12,
            transform: open ? "rotate(0)" : "rotate(-90deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </div>
      <div
        style={{
          overflow: "visible",
          maxHeight: open ? 2000 : 0,
          opacity: open ? 1 : 0,
          transition: "max-height 0.35s ease, opacity 0.25s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function StatusBanner({ status, theme }) {
  if (!status) return null;
  const cfg = {
    ok: { bg: theme.greenBg, border: "#00c47a44", color: theme.green },
    caution: { bg: theme.amberBg, border: "#f5a62344", color: theme.amber },
    error: { bg: theme.redBg, border: "#f5415a44", color: theme.red },
  }[status.type];
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 10,
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        marginTop: 8,
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
        {status.icon}
      </span>
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: cfg.color,
            fontFamily: "Syne, sans-serif",
          }}
        >
          {status.title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: cfg.color,
            opacity: 0.8,
            marginTop: 2,
            fontFamily: "Lato, sans-serif",
          }}
        >
          {status.detail}
        </div>
      </div>
    </div>
  );
}

function NumberInput({
  label,
  name,
  value,
  onChange,
  tip,
  unit,
  highlight,
  theme,
  step = "1",
  min,
}) {
  const T = theme;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "9px 12px",
        borderRadius: 10,
        background: highlight ? T.accentGlow : T.surface2,
        border: `1px solid ${highlight ? T.accent + "55" : T.border}`,
        transition: "border 0.2s",
      }}
    >
      <label
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: highlight ? T.accent : T.textMuted,
          display: "flex",
          alignItems: "center",
          gap: 4,
          fontFamily: "Lato, sans-serif",
        }}
      >
        <Tooltip tip={tip}>{label}</Tooltip>
        {unit && (
          <span
            style={{
              fontSize: 10,
              color: T.textDim,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            [{unit}]
          </span>
        )}
      </label>
      <input
        type="number"
        name={name}
        value={value ?? ""}
        onChange={onChange}
        step={step}
        min={min}
        style={{
          width: 90,
          padding: "6px 10px",
          borderRadius: 8,
          border: `1.5px solid ${T.borderAlt}`,
          fontSize: 13,
          fontWeight: 700,
          textAlign: "right",
          background: T.surface,
          color: T.text,
          outline: "none",
          fontFamily: "JetBrains Mono, monospace",
        }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SVG CROSS-SECTION DIAGRAM
───────────────────────────────────────────────────────────── */
function CrossSection({ t1, t2, l, d, penStatus, member2Type, theme }) {
  const total = t1 + t2;
  const scale = total > 0 ? 150 / Math.max(total, l) : 0.5;
  const t1s = t1 * scale,
    t2s = t2 * scale,
    ls = l * scale;
  const pen = l - t1;
  const minPen = Math.max(4 * d, 40);
  const sColor = !penStatus
    ? "#4a6080"
    : penStatus.type === "ok"
      ? "#00c47a"
      : penStatus.type === "caution"
        ? "#f5a623"
        : "#f5415a";

  return (
    <svg
      width="100%"
      viewBox="0 0 520 270"
      style={{ borderRadius: 12, overflow: "visible" }}
    >
      <defs>
        <pattern id="wood1" patternUnits="userSpaceOnUse" width="12" height="6">
          <rect width="12" height="6" fill="#c8860022" />
          <line
            x1="0"
            y1="3"
            x2="12"
            y2="3"
            stroke="#c8860033"
            strokeWidth="0.5"
          />
        </pattern>
        <pattern id="wood2" patternUnits="userSpaceOnUse" width="10" height="5">
          <rect width="10" height="5" fill="#7c520010" />
          <line
            x1="0"
            y1="2.5"
            x2="10"
            y2="2.5"
            stroke="#7c520025"
            strokeWidth="0.5"
          />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ─ All y references use MT (memberTop) = 58, giving 58px clear above for callouts ─ */}
      {(() => {
        const MT = 58; // member top — clear zone above reserved for callout boxes

        const screwX = 200;
        const shaftW = Math.max(6, d * 0.7);
        const tipLen = shaftW * 1.2;
        const bodyEnd = MT + Math.min(ls, t1s + t2s);
        const tipEnd = bodyEnd + tipLen;

        // Screw head sits just above MT with a small gap
        const headH = shaftW * 1.1;
        const headY = MT - headH - 4;
        const headCY = headY + headH / 2;

        // Callout boxes — comfortably above the head
        const box1Y = 4,
          box1H = 18,
          box1W = 128,
          box1X = 6;
        const box2Y = 25,
          box2H = 18,
          box2W = 128,
          box2X = 6;

        // Leader anchor = left edge of screw head
        const dotX = screwX - shaftW * 1.6;
        const dotY = headCY;
        const elbowX = dotX - 16;

        const leaderColor = "#5a8aaf";
        const statusColor = !penStatus
          ? "#5a8aaf"
          : penStatus.type === "ok"
            ? "#00c47a"
            : penStatus.type === "caution"
              ? "#f5a623"
              : "#f5415a";
        const statusText = !penStatus
          ? "—"
          : penStatus.type === "ok"
            ? `✓ pen. ${Math.max(0, Math.round(l - t1))}mm OK`
            : penStatus.type === "caution"
              ? `⚠ pen. ${Math.max(0, Math.round(l - t1))}mm low`
              : `✕ ${penStatus.title}`;

        const threadMarks = [];
        for (let y = MT + 6; y < bodyEnd - tipLen - 4; y += 8)
          threadMarks.push(y);

        return (
          <>
            {/* ── Member 1 – CLT Slab ── */}
            <rect
              x="80"
              y={MT}
              width="240"
              height={t1s}
              fill="url(#wood1)"
              stroke="#c88600"
              strokeWidth="1.5"
              rx="2"
            />
            <line
              x1="320"
              y1={MT + t1s / 2}
              x2="332"
              y2={MT + t1s / 2}
              stroke="#c88600"
              strokeWidth="1"
              opacity="0.6"
            />
            <text
              x="336"
              y={MT + t1s / 2 + 4}
              fill="#c88600"
              fontSize="10"
              fontWeight="700"
              textAnchor="start"
              fontFamily="JetBrains Mono, monospace"
            >
              CLT SLAB t1={t1}mm
            </text>

            {/* ── Member 2 ── */}
            <rect
              x="80"
              y={MT + t1s}
              width="240"
              height={t2s}
              fill="url(#wood2)"
              stroke="#7c5200"
              strokeWidth="1.5"
              rx="2"
            />
            <line
              x1="320"
              y1={MT + t1s + t2s / 2}
              x2="332"
              y2={MT + t1s + t2s / 2}
              stroke="#7c5200"
              strokeWidth="1"
              opacity="0.6"
            />
            <text
              x="336"
              y={MT + t1s + t2s / 2 + 4}
              fill="#a06030"
              fontSize="10"
              fontWeight="700"
              textAnchor="start"
              fontFamily="JetBrains Mono, monospace"
            >
              {member2Type === "CLT" ? "CLT SLAB" : "MAIN BEAM"} t2={t2}mm
            </text>

            {/* Interface dashed line */}
            <line
              x1="80"
              y1={MT + t1s}
              x2="320"
              y2={MT + t1s}
              stroke="#4a6080"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.6"
            />

            {/* ── SCREW (rendered on top of members) ── */}
            {/* Shadow halo */}
            <line
              x1={screwX}
              y1={MT}
              x2={screwX}
              y2={bodyEnd}
              stroke="rgba(0,0,0,0.55)"
              strokeWidth={shaftW + 6}
              strokeLinecap="round"
            />
            {/* Shaft */}
            <line
              x1={screwX}
              y1={MT}
              x2={screwX}
              y2={bodyEnd}
              stroke={sColor}
              strokeWidth={shaftW}
              strokeLinecap="butt"
            />
            {/* Metallic sheen */}
            <line
              x1={screwX - shaftW * 0.2}
              y1={MT + 4}
              x2={screwX - shaftW * 0.2}
              y2={bodyEnd - 4}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={shaftW * 0.28}
              strokeLinecap="round"
            />
            {/* Thread ticks */}
            {threadMarks.map((ty, i) => (
              <line
                key={i}
                x1={screwX - shaftW / 2 - 2}
                y1={ty}
                x2={screwX + shaftW / 2 + 2}
                y2={ty}
                stroke={sColor}
                strokeWidth="1.5"
                opacity="0.7"
              />
            ))}
            {/* Tip */}
            <polygon
              points={`${screwX - shaftW / 2},${bodyEnd} ${screwX + shaftW / 2},${bodyEnd} ${screwX},${tipEnd}`}
              fill={sColor}
              opacity="0.9"
            />
            {/* Over-penetration */}
            {ls > t1s + t2s && (
              <line
                x1={screwX}
                y1={MT + t1s + t2s}
                x2={screwX}
                y2={MT + ls}
                stroke="#f5415a"
                strokeWidth={shaftW}
                strokeDasharray="5 3"
                strokeLinecap="round"
                opacity="0.85"
              />
            )}
            {/* Head */}
            <rect
              x={screwX - shaftW * 1.6}
              y={headY}
              width={shaftW * 3.2}
              height={headH}
              rx="2"
              fill="#1a2a40"
              stroke={sColor}
              strokeWidth="1.5"
            />
            {/* Phillips slot */}
            <line
              x1={screwX - shaftW * 0.8}
              y1={headY + headH * 0.5}
              x2={screwX + shaftW * 0.8}
              y2={headY + headH * 0.5}
              stroke={sColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            <line
              x1={screwX}
              y1={headY + headH * 0.1}
              x2={screwX}
              y2={headY + headH * 0.9}
              stroke={sColor}
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* ── Penetration annotation (right side) ── */}
            {pen > 0 &&
              t2s > 0 &&
              (() => {
                const penScaled = Math.min(pen * scale, t2s);
                return (
                  <>
                    <line
                      x1="232"
                      y1={MT + t1s}
                      x2="232"
                      y2={MT + t1s + penScaled}
                      stroke={sColor}
                      strokeWidth="1.2"
                      strokeDasharray="3 2"
                    />
                    <line
                      x1="228"
                      y1={MT + t1s}
                      x2="236"
                      y2={MT + t1s}
                      stroke={sColor}
                      strokeWidth="1.5"
                    />
                    <line
                      x1="228"
                      y1={MT + t1s + penScaled}
                      x2="236"
                      y2={MT + t1s + penScaled}
                      stroke={sColor}
                      strokeWidth="1.5"
                    />
                    <text
                      x="244"
                      y={MT + t1s + penScaled / 2 + 4}
                      fill={sColor}
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="start"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      {Math.round(pen)}mm
                    </text>
                  </>
                );
              })()}

            {/* ── EC5 min penetration line ── */}
            {t2s > 0 &&
              (() => {
                const penScaled = Math.min(pen * scale, t2s);
                const mps =
                  pen > 0 ? Math.min((minPen / pen) * penScaled, t2s) : 0;
                return (
                  <>
                    <line
                      x1="80"
                      y1={MT + t1s + mps}
                      x2="390"
                      y2={MT + t1s + mps}
                      stroke="#f5a623"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                      opacity="0.7"
                    />
                    <text
                      x="86"
                      y={MT + t1s + mps - 3}
                      fill="#f5a623"
                      fontSize="8"
                      fontWeight="600"
                      fontFamily="JetBrains Mono, monospace"
                    >
                      EC5 min ({Math.round(minPen)}mm)
                    </text>
                  </>
                );
              })()}

            {/* ── Callout boxes above member 1 ── */}
            {/* Anchor dot */}
            <circle
              cx={dotX}
              cy={dotY}
              r="3"
              fill={leaderColor}
              opacity="0.9"
            />

            {/* Leader → box 1 (screw spec) */}
            <polyline
              points={`${dotX},${dotY} ${elbowX},${box1Y + box1H / 2} ${box1X + box1W},${box1Y + box1H / 2}`}
              fill="none"
              stroke={leaderColor}
              strokeWidth="1"
              opacity="0.6"
            />
            <rect
              x={box1X}
              y={box1Y}
              width={box1W}
              height={box1H}
              rx="3"
              fill="#0d1829"
              stroke={leaderColor}
              strokeWidth="0.8"
              opacity="0.93"
            />
            <text
              x={box1X + 7}
              y={box1Y + 13}
              fill="#8aaed0"
              fontSize="9.5"
              fontWeight="600"
              fontFamily="JetBrains Mono, monospace"
            >
              Ø{d}mm × {l}mm screw
            </text>

            {/* Leader → box 2 (pen status) */}
            <polyline
              points={`${dotX},${dotY} ${elbowX},${box2Y + box2H / 2} ${box2X + box2W},${box2Y + box2H / 2}`}
              fill="none"
              stroke={statusColor}
              strokeWidth="1"
              opacity="0.6"
            />
            <rect
              x={box2X}
              y={box2Y}
              width={box2W}
              height={box2H}
              rx="3"
              fill="#0d1829"
              stroke={statusColor}
              strokeWidth="0.8"
              opacity="0.93"
            />
            <text
              x={box2X + 7}
              y={box2Y + 13}
              fill={statusColor}
              fontSize="9.5"
              fontWeight="700"
              fontFamily="JetBrains Mono, monospace"
            >
              {statusText}
            </text>
          </>
        );
      })()}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   UTILIZATION GAUGE
───────────────────────────────────────────────────────────── */
function UtilizationGauge({ pct, theme: T }) {
  const color = pct <= 75 ? T.green : pct <= 100 ? T.amber : T.red;
  const r = 40,
    cx = 56,
    cy = 56;
  const circumference = 2 * Math.PI * r;
  const dash = (Math.min(pct, 120) / 120) * circumference * 0.75;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="112" height="80" style={{ overflow: "visible" }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={T.border}
          strokeWidth="8"
          strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
          strokeDashoffset={circumference * 0.125}
          strokeLinecap="round"
          transform={`rotate(135, ${cx}, ${cy})`}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference * 0.125}
          strokeLinecap="round"
          transform={`rotate(135, ${cx}, ${cy})`}
          style={{ transition: "stroke-dasharray 0.8s ease, stroke 0.4s" }}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fill={color}
          fontSize="16"
          fontWeight="800"
          fontFamily="JetBrains Mono, monospace"
        >
          {pct.toFixed(0)}%
        </text>
        <text
          x={cx}
          y={cy + 17}
          textAnchor="middle"
          fill={T.textDim}
          fontSize="8"
          fontFamily="Lato, sans-serif"
        >
          η ratio
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {[
          [T.green, "≤ 75%", "Efficient"],
          [T.amber, "≤ 100%", "Marginal"],
          [T.red, "> 100%", "Overloaded"],
        ].map(([c, range, label]) => (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: c,
                flexShrink: 0,
                opacity: color === c ? 1 : 0.3,
              }}
            />
            <span
              style={{
                fontSize: 10,
                color: T.textMuted,
                fontFamily: "Lato, sans-serif",
              }}
            >
              <b>{range}</b> {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOG CONSOLE
───────────────────────────────────────────────────────────── */
function LogConsole({ logs, theme: T }) {
  const endRef = useRef(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);
  if (!logs.length) return null;
  const typeColor = {
    event: "#e06cff",
    aws: "#38bdf8",
    success: "#00c47a",
    error: "#f5415a",
    info: "#5a7090",
  };
  return (
    <div
      style={{
        background: T.logBg,
        borderRadius: 14,
        border: `1px solid #0d1e30`,
        padding: "16px 20px",
        boxShadow: "inset 0 2px 12px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: "1px solid #0d1e30",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#00c47a",
              animation: "pulse 1.5s infinite",
            }}
          />
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#38bdf8",
              letterSpacing: "1px",
              textTransform: "uppercase",
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            AWS Cloud Event Stream
          </span>
        </div>
        <span
          style={{
            fontSize: 9,
            color: "#2a4060",
            fontFamily: "JetBrains Mono, monospace",
          }}
        >
          {logs.length} events
        </span>
      </div>
      <div
        style={{
          maxHeight: 160,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 5,
        }}
      >
        {logs.map((log, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 8,
              fontSize: 11,
              fontFamily: "JetBrains Mono, monospace",
            }}
          >
            <span style={{ color: "#1e3550", whiteSpace: "nowrap" }}>
              [{log.ts}]
            </span>
            <span style={{ color: typeColor[log.type] || "#5a7090" }}>
              {log.msg}
            </span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PROCUREMENT PIPELINE
───────────────────────────────────────────────────────────── */
function ProcurementPipeline({ stage, theme: T }) {
  if (stage === 0) return null;
  const nodes = [
    { icon: "💻", label: "Platform", color: T.accent, stage: 1 },
    { icon: "☁️", label: "AWS SNS/SQS", color: "#38bdf8", stage: 2 },
    { icon: "🏢", label: "Supplier ERP", color: T.green, stage: 3 },
  ];
  return (
    <div
      style={{
        marginTop: 16,
        padding: "14px 16px",
        background: T.surface2,
        borderRadius: 12,
        border: `1px solid ${T.border}`,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: T.textMuted,
          marginBottom: 12,
          letterSpacing: "0.5px",
          textTransform: "uppercase",
          fontFamily: "JetBrains Mono, monospace",
        }}
      >
        🚚 Order Dispatch Pipeline
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {nodes.map((n, i) => (
          <React.Fragment key={n.label}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 5,
                width: 80,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: stage >= n.stage ? n.color + "22" : T.surface2,
                  border: `2px solid ${stage >= n.stage ? n.color : T.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  transition: "all 0.4s",
                }}
              >
                {n.icon}
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: stage >= n.stage ? n.color : T.textDim,
                  textAlign: "center",
                  fontFamily: "Lato, sans-serif",
                }}
              >
                {n.label}
              </span>
            </div>
            {i < nodes.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 3,
                  background: T.border,
                  borderRadius: 2,
                  margin: "0 4px",
                  marginBottom: 16,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: stage > n.stage ? "100%" : "0%",
                    background: nodes[i + 1].color,
                    transition: "width 0.8s ease",
                    borderRadius: 2,
                  }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function TimberStructStudio() {
  const { addCalculation } = useAuth();
  const [dark, setDark] = useState(true);
  const [form, setForm] = useState({ ...DEFAULTS });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [orderStage, setOrderStage] = useState(0);
  const [ordered, setOrdered] = useState(false);

  const T = getTheme(dark);

  const log = useCallback((msg, type = "info") => {
    const ts = new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    setLogs((p) => [...p, { ts, msg, type }]);
  }, []);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({
      ...p,
      [name]:
        name === "member2Type" ? value : value === "" ? "" : parseFloat(value),
    }));
    setResults(null);
    setError(null);
    setOrderStage(0);
    setOrdered(false);
  };

  const onReset = () => {
    setForm({ ...DEFAULTS });
    setResults(null);
    setError(null);
    setLogs([]);
    setOrderStage(0);
    setOrdered(false);
  };

  // Derived
  const t1 = form.slabThickness || 0,
    t2 = form.beamThickness || 0;
  const l = form.screwLength || 0,
    d = form.screwDiameter || 8;
  const minPen = Math.max(4 * d, 40);
  const penetrationDepth = l - t1;
  const penStatus = getPenetrationStatus(l, t1, t2, d);
  const screwInvalid = penStatus?.type === "error";
  const screwCount = Math.max(4, Math.ceil((form.shearLoad || 25) / 5) * 2);
  const estimatedCost = (screwCount * 2.75).toFixed(2);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (screwInvalid) {
      setError(`Geometry Error: ${penStatus.detail}`);
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);
    setLogs([]);
    setOrderStage(0);
    setOrdered(false);

    log(
      "🚀 [REST API] Execute Structural Analysis — event triggered.",
      "event",
    );
    log("📦 [PAYLOAD] Serializing JSON parameter schema...", "info");

    const payload = {
      slabThickness: form.slabThickness,
      beamThickness: form.beamThickness,
      beamWidth: form.beamWidth,
      screwDiameter: form.screwDiameter,
      screwLength: form.screwLength,
      shearLoad: form.shearLoad,
      woodDensity: Math.min(form.slabDensity || 420, form.beamDensity || 420),
      screwCount,
      connectionWidth: form.connectionWidth,
      connectionLength: form.connectionLength,
      slabDensity: form.slabDensity,
      beamDensity: form.beamDensity,
    };

    setTimeout(
      () => log(`🌐 [API GATEWAY] POST dispatched → ${API_URL}`, "aws"),
      350,
    );
    setTimeout(
      () =>
        log(
          "⚡ [LAMBDA] Cold start resolved. Executing Johansen Yield Limit equations (EC5 §8)...",
          "aws",
        ),
      850,
    );

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setTimeout(() => {
        log("✅ [LAMBDA] Compute complete — status 200 OK.", "success");
        if (data.status === "SAFE")
          log(
            `🛒 [PROCUREMENT] Connection SAFE — MTO generated for ${l}mm × ${d}mm screws.`,
            "success",
          );
        else
          log(
            "⚠️ [DESIGN] Interaction check failed — procurement engine locked.",
            "error",
          );
        setResults(data);
        setLoading(false);
        addCalculation({
          id: "CALC-" + Date.now().toString().slice(-6),
          type: "Timber Connection",
          standard: "Eurocode 5",
          status: data.status || "SAFE",
          date: new Date().toLocaleDateString(),
        });
      }, 1300);
    } catch (err) {
      log(
        `❌ [GATEWAY ERROR] ${err.message}. Verify CORS configuration and Lambda deployment.`,
        "error",
      );
      setError(
        "Connection to AWS Lambda failed. Check CORS policy and API Gateway deployment.",
      );
      setLoading(false);
    }
  };

  const onOrder = () => {
    setOrdered(true);
    setOrderStage(1);
    log(
      "📦 [ERP EVENT] Procurement transaction initiated on TimberStruct platform.",
      "event",
    );
    setTimeout(() => {
      setOrderStage(2);
      log(
        "☁️ [AWS SNS/SQS] JSON payload broadcast to decoupled supplier FIFO queue.",
        "aws",
      );
    }, 1000);
    setTimeout(() => {
      setOrderStage(3);
      log(
        "🏢 [SUPPLIER ERP] Order ingested from SQS queue by vendor inventory system.",
        "success",
      );
    }, 2400);
  };

  const utilizationPct = results?.utilization_percent ?? 0;
  const statusColor = results?.status === "SAFE" ? T.green : T.red;

  return (
    <>
      <style>{`
        ${FONTS}
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${T.bg}; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.3; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #1e3050; border-radius: 2px; }
        select { appearance: auto; }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          padding: "24px 20px",
          fontFamily: "Lato, sans-serif",
          transition: "background 0.3s",
        }}
      >
        <div style={{ maxWidth: 1220, margin: "0 auto" }}>
          {/* ── HEADER ── */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: 28,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 24 }}>🏗️</span>
                <h1
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: T.text,
                    fontFamily: "Syne, sans-serif",
                    letterSpacing: "-0.5px",
                    lineHeight: 1,
                  }}
                >
                  TimberStruct Studio
                </h1>
                <Badge color={T.accent}>v2.0</Badge>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: T.textMuted,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                EC5 Timber Connection Analysis · Event-Driven AWS Architecture ·
                Automated Procurement
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                onClick={onReset}
                style={{
                  padding: "7px 14px",
                  border: `1px solid ${T.border}`,
                  background: "transparent",
                  color: T.textMuted,
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "Lato, sans-serif",
                }}
              >
                ↺ Reset
              </button>
              <button
                onClick={() => setDark((d) => !d)}
                style={{
                  padding: "7px 14px",
                  border: `1px solid ${T.border}`,
                  background: "transparent",
                  color: T.textMuted,
                  borderRadius: 8,
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "Lato, sans-serif",
                }}
              >
                {dark ? "☀ Light" : "🌙 Dark"}
              </button>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 14px",
                  background: loading ? "#0a1a40" : T.surface,
                  border: `1px solid ${loading ? T.accent + "44" : T.border}`,
                  borderRadius: 8,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: loading ? T.amber : T.green,
                    animation: loading ? "pulse 1s infinite" : "none",
                  }}
                />
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: loading ? T.amber : T.green,
                    fontFamily: "JetBrains Mono, monospace",
                    letterSpacing: "0.5px",
                  }}
                >
                  {loading ? "COMPUTING" : "RUNTIME LIVE"}
                </span>
              </div>
            </div>
          </div>

          {/* ── MAIN GRID ── */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "360px 1fr",
              gap: 20,
              alignItems: "start",
            }}
          >
            {/* LEFT – FORM */}
            <form
              onSubmit={onSubmit}
              style={{
                background: T.surface,
                borderRadius: 18,
                border: `1px solid ${T.border}`,
                padding: 24,
                boxShadow: T.shadowSm,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: T.text,
                  marginBottom: 20,
                  paddingBottom: 12,
                  borderBottom: `1px solid ${T.border}`,
                  fontFamily: "Syne, sans-serif",
                }}
              >
                Design Parameters
              </div>

              {/* SECTION 1 – Timber Elements */}
              <Section title="1 · Timber Elements" badge="Required" theme={T}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 12 }}
                >
                  {/* Member 1 */}
                  <div
                    style={{
                      background: T.surface2,
                      borderRadius: 12,
                      padding: 14,
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#c88600",
                        marginBottom: 10,
                        fontFamily: "JetBrains Mono, monospace",
                        letterSpacing: "0.5px",
                      }}
                    >
                      ▲ MEMBER 1 — CLT Slab (Top)
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <NumberInput
                        label="Thickness t1"
                        name="slabThickness"
                        value={form.slabThickness}
                        onChange={onChange}
                        tip="Thickness of the CLT slab (top member). Governs screw embedment geometry."
                        unit="mm"
                        theme={T}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <label
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: T.textMuted,
                            fontFamily: "Lato, sans-serif",
                          }}
                        >
                          <Tooltip tip="Characteristic density ρk1 — used in Johansen equations for embedment strength fh,k.">
                            Characteristic Density ρk1 [kg/m³]
                          </Tooltip>
                        </label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <select
                            name="slabDensitySelect"
                            value={
                              CLT_SPECIES.find(
                                (s) => s.density === form.slabDensity,
                              )?.density ?? "custom"
                            }
                            onChange={(e) => {
                              if (e.target.value !== "custom")
                                setForm((p) => ({
                                  ...p,
                                  slabDensity: parseFloat(e.target.value),
                                }));
                            }}
                            style={{
                              flex: 1,
                              padding: "7px 8px",
                              borderRadius: 8,
                              border: `1px solid ${T.borderAlt}`,
                              background: T.surface,
                              color: T.text,
                              fontSize: 11,
                              fontFamily: "Lato, sans-serif",
                            }}
                          >
                            {CLT_SPECIES.map((s) => (
                              <option key={s.name} value={s.density}>
                                {s.name}
                              </option>
                            ))}
                            <option value="custom">✏ Custom…</option>
                          </select>
                          <input
                            type="number"
                            name="slabDensity"
                            value={form.slabDensity ?? ""}
                            onChange={onChange}
                            style={{
                              width: 72,
                              padding: "7px 8px",
                              borderRadius: 8,
                              border: `1px solid ${T.borderAlt}`,
                              background: T.surface,
                              color: T.text,
                              fontSize: 12,
                              fontWeight: 700,
                              textAlign: "center",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Member 2 */}
                  <div
                    style={{
                      background: T.surface2,
                      borderRadius: 12,
                      padding: 14,
                      border: `1px solid ${T.border}`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#7c9ec8",
                          fontFamily: "JetBrains Mono, monospace",
                          letterSpacing: "0.5px",
                        }}
                      >
                        ▼ MEMBER 2 —{" "}
                        {form.member2Type === "CLT" ? "CLT Slab" : "Main Beam"}{" "}
                        (Bottom)
                      </div>
                      <select
                        name="member2Type"
                        value={form.member2Type}
                        onChange={(e) =>
                          setForm((p) => ({
                            ...p,
                            member2Type: e.target.value,
                          }))
                        }
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: 6,
                          border: "1px solid #7c9ec844",
                          color: "#7c9ec8",
                          background: dark ? "#0a1522" : "#f0f6ff",
                        }}
                      >
                        <option value="Beam">Main Beam</option>
                        <option value="CLT">CLT Slab</option>
                      </select>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <NumberInput
                        label={`Thickness t2`}
                        name="beamThickness"
                        value={form.beamThickness}
                        onChange={onChange}
                        tip="Thickness of the bottom member receiving the screw tip. Must allow adequate penetration."
                        unit="mm"
                        theme={T}
                      />
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 4,
                        }}
                      >
                        <label
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: T.textMuted,
                            fontFamily: "Lato, sans-serif",
                          }}
                        >
                          <Tooltip tip="Characteristic density ρk2 of the receiving member — affects embedment strength in Member 2.">
                            Characteristic Density ρk2 [kg/m³]
                          </Tooltip>
                        </label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <select
                            name="beamDensitySelect"
                            value={
                              (form.member2Type === "CLT"
                                ? CLT_SPECIES
                                : BEAM_SPECIES
                              ).find((s) => s.density === form.beamDensity)
                                ?.density ?? "custom"
                            }
                            onChange={(e) => {
                              if (e.target.value !== "custom")
                                setForm((p) => ({
                                  ...p,
                                  beamDensity: parseFloat(e.target.value),
                                }));
                            }}
                            style={{
                              flex: 1,
                              padding: "7px 8px",
                              borderRadius: 8,
                              border: `1px solid ${T.borderAlt}`,
                              background: T.surface,
                              color: T.text,
                              fontSize: 11,
                              fontFamily: "Lato, sans-serif",
                            }}
                          >
                            {(form.member2Type === "CLT"
                              ? CLT_SPECIES
                              : BEAM_SPECIES
                            ).map((s) => (
                              <option key={s.name} value={s.density}>
                                {s.name}
                              </option>
                            ))}
                            <option value="custom">✏ Custom…</option>
                          </select>
                          <input
                            type="number"
                            name="beamDensity"
                            value={form.beamDensity ?? ""}
                            onChange={onChange}
                            style={{
                              width: 72,
                              padding: "7px 8px",
                              borderRadius: 8,
                              border: `1px solid ${T.borderAlt}`,
                              background: T.surface,
                              color: T.text,
                              fontSize: 12,
                              fontWeight: 700,
                              textAlign: "center",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* SECTION 2 – Fastener */}
              <Section title="2 · Fastener Assembly" theme={T}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <NumberInput
                    label="Screw Length l"
                    name="screwLength"
                    value={form.screwLength}
                    onChange={onChange}
                    tip={`Must exceed t1 (${t1}mm) to reach Member 2, with ≥ ${minPen}mm penetration (EC5 §8.7.2).`}
                    unit="mm"
                    theme={T}
                  />
                  <StatusBanner status={penStatus} theme={T} />

                  {/* Penetration progress bar */}
                  {t2 > 0 && l > 0 && (
                    <div
                      style={{
                        padding: "10px 12px",
                        background: T.surface2,
                        borderRadius: 10,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 10,
                          fontWeight: 700,
                          marginBottom: 6,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        <span style={{ color: T.textMuted }}>
                          Penetration into M2
                        </span>
                        <span
                          style={{
                            color:
                              penStatus?.type === "ok"
                                ? T.green
                                : penStatus?.type === "caution"
                                  ? T.amber
                                  : T.red,
                          }}
                        >
                          {Math.max(0, Math.round(penetrationDepth))}mm / min{" "}
                          {Math.round(minPen)}mm
                        </span>
                      </div>
                      <div
                        style={{
                          height: 6,
                          background: T.border,
                          borderRadius: 3,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.min(100, Math.max(0, (penetrationDepth / t2) * 100))}%`,
                            background:
                              penStatus?.type === "ok"
                                ? T.green
                                : penStatus?.type === "caution"
                                  ? T.amber
                                  : T.red,
                            transition: "width 0.4s, background 0.3s",
                            borderRadius: 3,
                          }}
                        />
                      </div>
                      <div
                        style={{
                          position: "relative",
                          height: 14,
                          marginTop: 2,
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            left: `${Math.min(98, (minPen / t2) * 100)}%`,
                            top: 0,
                            width: 2,
                            height: 8,
                            background: T.amber,
                            borderRadius: 1,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <NumberInput
                    label="Thread Diameter d"
                    name="screwDiameter"
                    value={form.screwDiameter}
                    onChange={onChange}
                    tip="Nominal outer thread diameter (d). Governs 4d minimum penetration rule (EC5 §8.7.2)."
                    unit="mm"
                    theme={T}
                  />
                </div>
              </Section>

              {/* SECTION 3 – Geometry */}
              <Section title="3 · Connection Geometry" theme={T}>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <NumberInput
                    label="Connection Width"
                    name="connectionWidth"
                    value={form.connectionWidth}
                    onChange={onChange}
                    tip="Total available connection zone width — used for EC5 edge and spacing checks."
                    unit="mm"
                    theme={T}
                  />
                  <NumberInput
                    label="Connection Length"
                    name="connectionLength"
                    value={form.connectionLength}
                    onChange={onChange}
                    tip="Total available connection zone length — used for end-distance and spacing checks."
                    unit="mm"
                    theme={T}
                  />
                </div>
              </Section>

              {/* SECTION 4 – Load */}
              <Section title="4 · Structural Demand" theme={T}>
                <NumberInput
                  label="Design Shear Demand Vd"
                  name="shearLoad"
                  value={form.shearLoad}
                  onChange={onChange}
                  tip="ULS shear force per Eurocode 5 — the load the connection must resist."
                  unit="kN"
                  step="0.1"
                  highlight
                  theme={T}
                />
              </Section>

              <button
                type="submit"
                disabled={loading || screwInvalid}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: screwInvalid
                    ? "#2a0a10"
                    : loading
                      ? "#0a1840"
                      : T.accent,
                  color: screwInvalid ? T.red : "#fff",
                  border: `1px solid ${screwInvalid ? T.red + "44" : loading ? T.accent + "44" : "transparent"}`,
                  borderRadius: 12,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: loading || screwInvalid ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "Syne, sans-serif",
                  letterSpacing: "0.3px",
                  transition: "all 0.2s",
                }}
              >
                {screwInvalid ? (
                  "⛔ Fix Geometry Error to Continue"
                ) : loading ? (
                  <>
                    <span
                      style={{
                        width: 14,
                        height: 14,
                        border: "2px solid #ffffff44",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        display: "inline-block",
                      }}
                    />{" "}
                    Running Analysis…
                  </>
                ) : (
                  "⚡ Execute Structural Analysis"
                )}
              </button>

              {penStatus?.type === "caution" && (
                <p
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    color: T.amber,
                    textAlign: "center",
                    fontFamily: "Lato, sans-serif",
                  }}
                >
                  ⚠ Warning active — submission allowed but verify EC5 §8.7.2
                  compliance.
                </p>
              )}
            </form>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {/* Cross-section diagram */}
              <div
                style={{
                  background: T.surface,
                  borderRadius: 18,
                  border: `1px solid ${T.border}`,
                  padding: 20,
                  boxShadow: T.shadowSm,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: T.textMuted,
                    marginBottom: 12,
                    letterSpacing: "0.5px",
                    textTransform: "uppercase",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  📐 Live Cross-Section Profile
                </div>
                <CrossSection
                  t1={t1}
                  t2={t2}
                  l={l}
                  d={d}
                  penStatus={penStatus}
                  member2Type={form.member2Type}
                  theme={T}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  {[
                    ["t1", `${t1}mm`, T.text],
                    ["t2", `${t2}mm`, T.text],
                    [
                      "l",
                      `${l}mm`,
                      penStatus?.type === "ok"
                        ? T.green
                        : penStatus?.type === "caution"
                          ? T.amber
                          : T.red,
                    ],
                    ["d", `${d}mm`, T.text],
                    [
                      "pen",
                      `${Math.max(0, Math.round(penetrationDepth))}mm`,
                      penStatus?.type === "ok" ? T.green : T.red,
                    ],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: 9,
                          color: T.textDim,
                          fontFamily: "JetBrains Mono, monospace",
                          marginBottom: 2,
                        }}
                      >
                        {k}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: c,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Results */}
              <div
                style={{
                  background: T.surface,
                  borderRadius: 18,
                  border: `1px solid ${T.border}`,
                  padding: 24,
                  boxShadow: T.shadowSm,
                }}
              >
                {!results && !error && !loading && (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "32px 0",
                      color: T.textMuted,
                      fontSize: 13,
                      fontFamily: "Lato, sans-serif",
                    }}
                  >
                    <div style={{ fontSize: 32, marginBottom: 10 }}>🔬</div>
                    Configure parameters and execute analysis to receive EC5
                    results from AWS Lambda.
                  </div>
                )}

                {loading && (
                  <div style={{ textAlign: "center", padding: "32px 0" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        border: `3px solid ${T.border}`,
                        borderTopColor: T.accent,
                        borderRadius: "50%",
                        animation: "spin 0.9s linear infinite",
                        margin: "0 auto 16px",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 13,
                        color: T.accent,
                        fontWeight: 700,
                        fontFamily: "Syne, sans-serif",
                      }}
                    >
                      Streaming to AWS Lambda Engine…
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    style={{
                      padding: 16,
                      background: T.redBg,
                      border: `1px solid ${T.red}44`,
                      borderRadius: 12,
                      color: T.red,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "Lato, sans-serif",
                    }}
                  >
                    ❌ {error}
                  </div>
                )}

                {results && !loading && (
                  <div>
                    {/* Status header */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 20,
                        paddingBottom: 14,
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: T.text,
                          fontFamily: "Syne, sans-serif",
                        }}
                      >
                        EC5 Analytical Summary
                      </span>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        {results.geometryStatus === "FAIL" && (
                          <Badge color={T.amber}>GEOM FAIL</Badge>
                        )}
                        <div
                          style={{
                            padding: "5px 16px",
                            borderRadius: 8,
                            fontWeight: 800,
                            fontSize: 12,
                            background:
                              results.status === "SAFE" ? T.greenBg : T.redBg,
                            color: statusColor,
                            border: `1px solid ${statusColor}44`,
                            fontFamily: "JetBrains Mono, monospace",
                          }}
                        >
                          {results.status}
                        </div>
                      </div>
                    </div>

                    {/* Metric cards */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr 1fr",
                        gap: 10,
                        marginBottom: 20,
                      }}
                    >
                      {[
                        {
                          label: "Embedment fh,k",
                          value: results.embedmentStrength_MPa,
                          unit: "MPa",
                          color: T.accent,
                        },
                        {
                          label: "Single Capacity",
                          value: results.singleDesignCapacity_kN,
                          unit: "kN",
                          color: T.text,
                        },
                        {
                          label: "Total Fv,Rd",
                          value: results.totalDesignCapacity_kN,
                          unit: "kN",
                          color: T.green,
                        },
                      ].map((m) => (
                        <div
                          key={m.label}
                          style={{
                            background: T.surface2,
                            border: `1px solid ${T.border}`,
                            borderRadius: 12,
                            padding: "12px 14px",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 9,
                              fontWeight: 700,
                              color: T.textMuted,
                              marginBottom: 4,
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                              fontFamily: "JetBrains Mono, monospace",
                            }}
                          >
                            {m.label}
                          </div>
                          <div
                            style={{
                              fontSize: 20,
                              fontWeight: 800,
                              color: m.color,
                              fontFamily: "Syne, sans-serif",
                            }}
                          >
                            {m.value}{" "}
                            <span
                              style={{
                                fontSize: 11,
                                color: T.textMuted,
                                fontFamily: "Lato, sans-serif",
                              }}
                            >
                              {m.unit}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Gauge */}
                    <div
                      style={{
                        background: T.surface2,
                        border: `1px solid ${T.border}`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        marginBottom: 16,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: T.textMuted,
                          marginBottom: 10,
                          fontFamily: "JetBrains Mono, monospace",
                        }}
                      >
                        UTILIZATION RATIO η = Vd / Fv,Rd
                      </div>
                      <UtilizationGauge pct={utilizationPct} theme={T} />
                    </div>

                    {/* Geometry check */}
                    {results.geometryStatus && (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius: 10,
                          background:
                            results.geometryStatus === "PASS"
                              ? T.greenBg
                              : T.amberBg,
                          border: `1px solid ${results.geometryStatus === "PASS" ? T.green : T.amber}44`,
                          fontSize: 11,
                          color:
                            results.geometryStatus === "PASS"
                              ? T.green
                              : T.amber,
                          fontFamily: "Lato, sans-serif",
                          marginBottom: 16,
                        }}
                      >
                        <b>Spacing / Geometry Check:</b>{" "}
                        {results.geometryStatus} — Required{" "}
                        {results.requiredGeometry}
                        {results.errorMessage && (
                          <div style={{ marginTop: 4, opacity: 0.85 }}>
                            {results.errorMessage}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Procurement */}
                    {results.status === "SAFE" && (
                      <div
                        style={{
                          paddingTop: 16,
                          borderTop: `1px dashed ${T.border}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: T.text,
                            marginBottom: 12,
                            fontFamily: "Syne, sans-serif",
                          }}
                        >
                          🛒 Automated Procurement Take-Off
                        </div>
                        <div
                          style={{
                            background: T.greenBg,
                            border: `1px solid ${T.green}33`,
                            borderRadius: 12,
                            padding: 14,
                          }}
                        >
                          {[
                            [
                              "Recommended Fastener",
                              `Self-tapping Structural Screw ${l}mm × ${d}mm`,
                            ],
                            ["MTO Quantity", `${screwCount} pcs`],
                            ["Estimated Cost", `$${estimatedCost} USD`],
                            [
                              "Screws Used in Analysis",
                              `${results.screwsUsed} pcs`,
                            ],
                          ].map(([k, v]) => (
                            <div
                              key={k}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                fontSize: 11,
                                color: T.green,
                                marginBottom: 6,
                                fontFamily: "Lato, sans-serif",
                              }}
                            >
                              <span style={{ opacity: 0.8 }}>{k}:</span>
                              <span style={{ fontWeight: 700 }}>{v}</span>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={onOrder}
                            disabled={ordered}
                            style={{
                              width: "100%",
                              marginTop: 10,
                              padding: "10px",
                              background: ordered ? "#0a2e1a" : T.green,
                              color: "#fff",
                              border: "none",
                              borderRadius: 10,
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: ordered ? "default" : "pointer",
                              fontFamily: "Syne, sans-serif",
                              opacity: ordered ? 0.7 : 1,
                            }}
                          >
                            {ordered
                              ? "✅ Purchase Order Dispatched"
                              : "📦 Dispatch Automated Purchase Order"}
                          </button>
                          <ProcurementPipeline stage={orderStage} theme={T} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Log console */}
              <LogConsole logs={logs} theme={T} />
            </div>
          </div>

          {/* ── STATUS BAR ── */}
          <div
            style={{
              position: "sticky",
              bottom: 0,
              background: T.logBg,
              borderTop: `1px solid #0d1e30`,
              padding: "8px 20px",
              marginTop: 16,
              display: "flex",
              gap: 20,
              alignItems: "center",
              borderRadius: "0 0 14px 14px",
              zIndex: 50,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: "#2a4060",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "1px",
                fontFamily: "JetBrains Mono, monospace",
              }}
            >
              Live Parameters
            </span>
            {[
              ["t1", `${t1}mm`],
              ["t2", `${t2}mm`],
              ["l", `${l}mm`],
              ["d", `${d}mm`],
              ["pen", `${Math.max(0, Math.round(penetrationDepth))}mm`],
              ["Vd", `${form.shearLoad || 0}kN`],
              ["n", `${screwCount}pcs`],
              ["est.", `$${estimatedCost}`],
            ].map(([k, v]) => (
              <div
                key={k}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    fontSize: 8,
                    color: "#2a4060",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {k}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color:
                      k === "pen"
                        ? penStatus?.type === "ok"
                          ? T.green
                          : penStatus?.type === "caution"
                            ? T.amber
                            : T.red
                        : "#8aaed0",
                    fontFamily: "JetBrains Mono, monospace",
                  }}
                >
                  {v}
                </span>
              </div>
            ))}
            {results && (
              <div
                style={{
                  marginLeft: "auto",
                  padding: "3px 12px",
                  borderRadius: 6,
                  fontWeight: 800,
                  fontSize: 11,
                  background: results.status === "SAFE" ? T.greenBg : T.redBg,
                  color: statusColor,
                  border: `1px solid ${statusColor}33`,
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {results.status}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
