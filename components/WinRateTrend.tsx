"use client";

import { useState } from "react";

interface TrendPoint {
  date: string;
  rate: number;
  won: boolean;
}

interface Props {
  data: TrendPoint[];
}

function smoothPath(xs: number[], ys: number[]): string {
  if (xs.length < 2) return "";
  let d = `M${xs[0]},${ys[0]}`;
  for (let i = 1; i < xs.length; i++) {
    const x0 = xs[i - 2] ?? xs[i - 1];
    const y0 = ys[i - 2] ?? ys[i - 1];
    const x1 = xs[i - 1], y1 = ys[i - 1];
    const x2 = xs[i], y2 = ys[i];
    const x3 = xs[i + 1] ?? x2;
    const y3 = ys[i + 1] ?? y2;
    const cp1x = x1 + (x2 - x0) / 6;
    const cp1y = y1 + (y2 - y0) / 6;
    const cp2x = x2 - (x3 - x1) / 6;
    const cp2y = y2 - (y3 - y1) / 6;
    d += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${x2},${y2}`;
  }
  return d;
}

function formatDateKr(dateStr: string): string {
  const [, mm, dd] = dateStr.split("-");
  return `${parseInt(mm)}월 ${parseInt(dd)}일`;
}

export function WinRateTrend({ data }: Props) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  if (data.length < 2) return null;

  const W = 600, H = 150, PX = 36, PY = 18, BOTTOM = 28;
  const pw = W - PX * 2;
  const ph = H - PY - BOTTOM;

  const xs = data.map((_, i) => PX + (i / (data.length - 1)) * pw);
  const ys = data.map(p => PY + (1 - p.rate) * ph);

  const path = smoothPath(xs, ys);
  const y50 = PY + 0.5 * ph;
  const lastRate = data[data.length - 1].rate;
  const minR = Math.min(...data.map(p => p.rate));
  const maxR = Math.max(...data.map(p => p.rate));

  const monthLabels: { x: number; label: string }[] = [];
  data.forEach((p, i) => {
    const month = p.date.slice(0, 7);
    if (i === 0 || data[i - 1].date.slice(0, 7) !== month) {
      monthLabels.push({ x: xs[i], label: `${parseInt(p.date.slice(5, 7))}월` });
    }
  });

  const areaPath = path + ` L${xs[xs.length - 1]},${PY + ph} L${xs[0]},${PY + ph} Z`;

  // 활성 포인트 툴팁 계산
  const active = activeIdx !== null ? data[activeIdx] : null;
  const ax = activeIdx !== null ? xs[activeIdx] : 0;
  const ay = activeIdx !== null ? ys[activeIdx] : 0;
  // 툴팁이 오른쪽 끝에 가까우면 왼쪽으로
  const tooltipX = ax > W - 130 ? ax - 120 : ax + 8;
  const tooltipY = ay > PY + ph - 36 ? ay - 40 : ay - 4;

  return (
    <div className="p-4 rounded-lg border" style={{ background: "var(--panel)", borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>승률 곡선</div>
        <div className="flex gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
          <span>최저 <b style={{ color: minR < 0.5 ? "var(--loss)" : "var(--text)" }}>{Math.round(minR * 100)}%</b></span>
          <span>최고 <b style={{ color: maxR >= 0.5 ? "var(--win)" : "var(--text)" }}>{Math.round(maxR * 100)}%</b></span>
          <span>현재 <b style={{ color: lastRate >= 0.5 ? "var(--win)" : "var(--loss)" }}>{Math.round(lastRate * 100)}%</b></span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", cursor: "crosshair" }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* 50% 기준선 */}
        <line x1={PX} y1={y50} x2={W - PX} y2={y50} stroke="var(--border)" strokeWidth="1.5" strokeDasharray="5,4" />
        <text x={PX - 4} y={y50 + 4} textAnchor="end" fontSize="9" fill="var(--text-dim)">50%</text>
        <text x={PX - 4} y={PY + 4} textAnchor="end" fontSize="9" fill="var(--text-dim)">100%</text>
        <text x={PX - 4} y={PY + ph + 4} textAnchor="end" fontSize="9" fill="var(--text-dim)">0%</text>

        {/* 그라디언트 영역 */}
        <path d={areaPath} fill="url(#trendGrad)" />

        {/* 베지어 곡선 */}
        <path d={path} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinejoin="round" />

        {/* 활성 포인트 수직선 */}
        {activeIdx !== null && (
          <line x1={ax} y1={PY} x2={ax} y2={PY + ph} stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
        )}

        {/* 데이터 포인트 */}
        {data.map((p, i) => (
          <circle
            key={i}
            cx={xs[i]} cy={ys[i]}
            r={activeIdx === i ? 6 : 4}
            fill={p.won ? "#4ade80" : "#f87171"}
            stroke="var(--panel)"
            strokeWidth={activeIdx === i ? 2 : 1.5}
            style={{ cursor: "pointer", transition: "r 0.1s" }}
            onClick={() => setActiveIdx(activeIdx === i ? null : i)}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
          />
        ))}

        {/* 툴팁 */}
        {active !== null && activeIdx !== null && (
          <g>
            <rect
              x={tooltipX} y={tooltipY}
              width={110} height={42}
              rx={6} ry={6}
              fill="var(--panel)"
              stroke={active.won ? "#4ade80" : "#f87171"}
              strokeWidth="1.5"
              style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
            />
            <text x={tooltipX + 8} y={tooltipY + 15} fontSize="11" fontWeight="700" fill={active.won ? "#4ade80" : "#f87171"}>
              {active.won ? "✓ 승리" : "✗ 패배"}
            </text>
            <text x={tooltipX + 8} y={tooltipY + 28} fontSize="10" fill="var(--text-muted)">
              {formatDateKr(active.date)}
            </text>
            <text x={tooltipX + 8} y={tooltipY + 39} fontSize="10" fill="var(--text-dim)">
              누적 승률 {Math.round(active.rate * 100)}%
            </text>
          </g>
        )}

        {/* 월 레이블 */}
        {monthLabels.map(({ x, label }, i) => (
          <g key={i}>
            <line x1={x} y1={PY + ph} x2={x} y2={PY + ph + 5} stroke="var(--border)" strokeWidth="1" />
            <text x={x} y={H - 4} textAnchor="middle" fontSize="10" fill="var(--text-muted)">{label}</text>
          </g>
        ))}
      </svg>

      <div className="flex items-center gap-3 mt-1 text-xs justify-end" style={{ color: "var(--text-dim)" }}>
        <span className="flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} /> 승리
        </span>
        <span className="flex items-center gap-1">
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#f87171", display: "inline-block" }} /> 패배
        </span>
        <span>{data.length}경기 · 점 클릭 시 날짜 표시</span>
      </div>
    </div>
  );
}
