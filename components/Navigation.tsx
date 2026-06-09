"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

// ── 테마 정의 ──────────────────────────────────────────────────
type ThemeId = "leaf" | "rain" | "aka";

const THEMES: { id: ThemeId; name: string; icon: string; title: string; subtitle: string; accentColor: string }[] = [
  { id: "leaf", name: "나뭇잎 마을", icon: "🍃", title: "나뭇잎 마을 내전 기록소", subtitle: "(상급닌자 제1시험)", accentColor: "#2A5C1E" },
  { id: "rain", name: "비 마을",     icon: "🌧️", title: "비 마을 내전 기록소",     subtitle: "(페인의 시험)",      accentColor: "#9d92d4" },
  { id: "aka",  name: "아카츠키",    icon: "🌕", title: "아카츠키 전쟁 기록소",    subtitle: "(달의 눈 계획)",     accentColor: "#c93b3b" },
];

const navItems = [
  { href: "/ranking",  label: "랭킹",       icon: "🏆" },
  { href: "/champion", label: "챔피언 분석", icon: "⚔️" },
  { href: "/calendar", label: "달력",        icon: "📅" },
  { href: "/analysis", label: "캡쳐분석",    icon: "📸" },
  { href: "/team",     label: "팀편성",      icon: "🎲" },
  { href: "/manage",   label: "마을 관리",   icon: "🏕️" },
];

// ── 비 마을 빗줄기 ──────────────────────────────────────────────
const RAIN_DROPS = Array.from({ length: 40 }, (_, i) => ({
  left: `${(i * 2.5 + (i % 3) * 1.2) % 100}%`,
  height: `${60 + (i % 5) * 16}px`,
  duration: `${0.65 + (i % 4) * 0.2}s`,
  delay: `${(i % 8) * 0.25}s`,
  opacity: 0.22 + (i % 3) * 0.08,
}));

// ── 아카츠키 구름 SVG ───────────────────────────────────────────
// 아카츠키 망토의 붉은 구름 모양을 SVG로 표현
// ── 아카츠키 구름 SVG ───────────────────────────────────────────
// 공식 아카츠키 구름 문양(흰색 외곽 테두리와 내부 붉은 구름 및 스월 무늬)을 SVG로 완벽히 재현
interface AkaCloudProps {
  style: React.CSSProperties;
  scale: number;
}

function AkaCloud({ style, scale }: AkaCloudProps) {
  return (
    <div className="aka-cloud" style={style}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
        <svg width="120" height="84" viewBox="0 0 135 95" xmlns="http://www.w3.org/2000/svg">
          <g transform="translate(-224, -225)">
            {/* 흰색 외곽선 배경 */}
            <path
              d="m 227.40099,267.05402 c 6.45569,7.71478 15.23315,9.38219 19.49447,5.81949 4.26133,-3.56271 7.55961,-12.53849 17.96582,-9.08497 -4.80883,-12.75572 9.52679,-28.22162 23.54086,-21.59068 3.74222,-17.29284 38.97513,-18.21764 41.42693,2.79631 31.42407,-8.8702 37.62135,56.10121 0,51.16226 -0.55543,17.04658 -31.39676,23.43105 -35.00576,7.24972 -6.22585,13.37989 -31.15308,15.19831 -33.76294,-2.88435 -16.74436,7.33033 -31.58933,-12.95522 -33.65938,-33.46778 z"
              fill="var(--cloud-stroke, #ffffff)"
            />
            {/* 내부 붉은 구름 몸체 및 소용돌이 */}
            <path
              d="m 309.69654,231.69965 c -4.37979,-0.10693 -8.80969,0.91553 -12.21875,2.84375 -3.40906,1.92822 -5.76454,4.64453 -6.53125,8.1875 -8.0298,28.80395 27.12564,23.03434 18.93613,5.03151 l 3.06106,-1.66761 c 10.04869,23.44669 -32.04993,29.09391 -25.46594,-1.6764 -12.08404,-5.71772 -24.16163,7.87548 -20.15625,18.5 0.33026,0.8686 0.11613,1.91887 -0.52783,2.58885 -0.64395,0.66997 -1.68492,0.92552 -2.56592,0.6299 -4.52361,-1.50125 -6.66773,-0.45854 -8.90625,1.4375 -2.23852,1.89604 -4.01668,4.95454 -6.6875,7.1875 -2.91591,2.43786 -7.0582,2.89529 -11.15625,1.8125 -2.09206,-0.55276 -4.20499,-1.5392 -6.25,-2.90625 1.80893,7.31123 5.18157,14.15434 9.46875,18.90625 5.61226,6.22063 12.13989,8.9096 19.5,5.6875 -2.272,-14.96953 20.69562,-22.16038 22.71776,-4.00084 l -2.85405,0.19367 c -2.0169,-14.01234 -19.94976,-8.56437 -16.42621,5.71342 0.95971,3.88883 2.25389,6.56266 4.5625,8.34375 2.30861,1.78109 5.36496,2.72367 8.59375,2.78125 6.45757,0.11515 13.33859,-3.35221 15.9375,-8.9375 0.42829,-0.93332 1.487,-1.53501 2.50803,-1.42537 1.02103,0.10964 1.92785,0.92239 2.14822,1.92537 0.73212,3.28252 2.62377,5.17881 5.4375,6.34375 2.81373,1.16494 6.59524,1.36361 10.3125,0.59375 3.71726,-0.76986 7.36262,-2.48382 10,-4.875 2.63738,-2.39118 4.2602,-5.35157 4.375,-8.875 -20.40344,-8.93813 -6.01105,-32.48351 7.41006,-24.7981 l -0.57248,2.56955 c -10.3894,-6.73983 -23.7222,14.73602 -4.05633,19.8848 8.72136,1.14494 14.33889,-1.60941 18.0625,-6.25 3.72361,-4.64059 5.42374,-11.44993 5.0625,-18.21875 -0.36124,-6.76882 -2.78832,-13.41317 -6.6875,-17.625 -3.89918,-4.21183 -9.01651,-6.24772 -16.09375,-4.25 -1.36364,0.36686 -2.92742,-0.69146 -3.09375,-2.09375 -0.5339,-4.576 -2.75732,-7.74997 -5.96875,-10 -3.21143,-2.25003 -7.4939,-3.45554 -11.875,-3.5625 z"
              fill="var(--cloud-fill, #b31010)"
            />
          </g>
        </svg>
      </div>
    </div>
  );
}

const AKA_CLOUDS: { top: string; left?: string; right?: string; duration: string; delay: string; scale: number; opacity: number }[] = [
  // Left side clouds (3)
  { top: "12%", left: "4%",   duration: "7s",  delay: "0s",   scale: 0.6,  opacity: 0.5 },
  { top: "42%", left: "8%",   duration: "9s",  delay: "1.5s", scale: 0.45, opacity: 0.45 },
  { top: "72%", left: "3%",   duration: "8s",  delay: "0.5s", scale: 0.55, opacity: 0.4 },
  // Right side clouds (3)
  { top: "18%", right: "4%",  duration: "10s", delay: "2s",   scale: 0.5,  opacity: 0.4 },
  { top: "48%", right: "10%", duration: "8.5s",delay: "1s",   scale: 0.65, opacity: 0.5 },
  { top: "78%", right: "5%",  duration: "9.5s",delay: "3s",   scale: 0.55, opacity: 0.45 },
];


export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [theme, setTheme] = useState<ThemeId>("leaf");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as ThemeId) || "leaf";
    if (["leaf", "rain", "aka"].includes(saved)) setTheme(saved as ThemeId);

    const handler = (e: Event) => {
      const id = (e as CustomEvent<ThemeId>).detail;
      if (["leaf", "rain", "aka"].includes(id)) setTheme(id);
    };
    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.remove("ame-mode", "aka-mode");
    if (theme === "rain") html.classList.add("ame-mode");
    if (theme === "aka")  html.classList.add("aka-mode");
    localStorage.setItem("theme", theme);
  }, [theme]);

  // 외부 클릭시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const cur = THEMES.find(t => t.id === theme)!;

  // 랜딩/로그인/초대 페이지에서는 네비게이션 숨김
  const hideNav = pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/invite/");
  if (hideNav) return null;

  return (
    <>
      {/* 나뭇잎 마을 입구 배경 (정문 도리이 기둥 및 마을 건물) */}
      {theme === "leaf" && (
        <>
          <div className="leaf-bg-valley pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.2, color: "var(--accent)" }}>
            {/* 왼쪽 절반 (나뭇잎 마을 정문 좌측 건물 + 홍살문/도리이 기둥) */}
            <div className="absolute left-0 bottom-0" style={{ height: "55vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 배경 나뭇잎/나무 실루엣 */}
                <path
                  d="M 0,280 Q 40,240 70,260 T 140,230 T 180,270 Q 210,310 190,360 L 0,400 Z"
                  fill="currentColor"
                  opacity="0.1"
                />
                <path
                  d="M 0,150 Q 50,110 90,130 T 160,110 T 200,160 Q 230,220 200,260 L 0,300 Z"
                  fill="currentColor"
                  opacity="0.08"
                />
                
                {/* 2층 건물 본체 실루엣 */}
                <path
                  d="M 0,600 L 220,600 L 220,450 L 180,280 L 0,230 Z"
                  fill="currentColor"
                  opacity="0.15"
                />
                
                {/* 2층 지붕 (Upper Roof) */}
                <path
                  d="M 0,230 L 190,285 L 190,298 L 0,245 Z"
                  fill="currentColor"
                  opacity="0.25"
                />
                <path
                  d="M 0,230 L 190,285 L 190,298 L 0,245 Z"
                  stroke="var(--accent-light)"
                  strokeWidth="2"
                  opacity="0.6"
                />
                {/* 기와 디테일 (Roof Tile Lines) */}
                <line x1="30" y1="238" x2="30" y2="253" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="60" y1="247" x2="60" y2="262" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="90" y1="256" x2="90" y2="271" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="120" y1="265" x2="120" y2="280" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="150" y1="273" x2="150" y2="288" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="180" y1="282" x2="180" y2="297" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />

                {/* 1층 지붕 (Lower Roof) */}
                <path
                  d="M 0,380 L 240,445 L 240,460 L 0,395 Z"
                  fill="currentColor"
                  opacity="0.25"
                />
                <path
                  d="M 0,380 L 240,445 L 240,460 L 0,395 Z"
                  stroke="var(--accent-light)"
                  strokeWidth="2"
                  opacity="0.6"
                />
                {/* 기와 디테일 */}
                <line x1="40" y1="391" x2="40" y2="406" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="80" y1="402" x2="80" y2="417" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="120" y1="413" x2="120" y2="428" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="160" y1="423" x2="160" y2="438" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="200" y1="434" x2="200" y2="449" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />

                {/* 기둥 및 나무 프레임 (Pillars & Frames) */}
                {/* 2층 기둥 */}
                <line x1="50" y1="250" x2="50" y2="380" stroke="var(--accent-light)" strokeWidth="1.5" opacity="0.5" />
                <line x1="120" y1="270" x2="120" y2="385" stroke="var(--accent-light)" strokeWidth="1.5" opacity="0.5" />
                <line x1="170" y1="285" x2="170" y2="390" stroke="var(--accent-light)" strokeWidth="1.5" opacity="0.5" />
                {/* 1층 기둥 */}
                <line x1="60" y1="455" x2="60" y2="600" stroke="var(--accent-light)" strokeWidth="2" opacity="0.5" />
                <line x1="140" y1="475" x2="140" y2="600" stroke="var(--accent-light)" strokeWidth="2" opacity="0.5" />
                <line x1="210" y1="495" x2="210" y2="600" stroke="var(--accent-light)" strokeWidth="2" opacity="0.5" />
                
                {/* 창문 격자무늬 (Window Grids) */}
                {/* 2층 창문 */}
                <rect x="70" y="295" width="35" height="45" stroke="var(--accent-light)" strokeWidth="1.2" opacity="0.45" />
                <line x1="87.5" y1="295" x2="87.5" y2="340" stroke="var(--accent-light)" strokeWidth="0.8" opacity="0.4" />
                <line x1="70" y1="317.5" x2="105" y2="317.5" stroke="var(--accent-light)" strokeWidth="0.8" opacity="0.4" />
                
                {/* 등불 (Lantern hanging from eave) */}
                <rect x="145" y="305" width="12" height="20" rx="3" fill="currentColor" opacity="0.3" stroke="var(--accent-light)" strokeWidth="1" />
                <line x1="145" y1="310" x2="157" y2="310" stroke="var(--accent-light)" strokeWidth="0.8" opacity="0.4" />
                <line x1="145" y1="315" x2="157" y2="315" stroke="var(--accent-light)" strokeWidth="0.8" opacity="0.4" />
                <line x1="145" y1="320" x2="157" y2="320" stroke="var(--accent-light)" strokeWidth="0.8" opacity="0.4" />
                <line x1="151" y1="300" x2="151" y2="305" stroke="var(--accent-light)" strokeWidth="1" opacity="0.5" />

                {/* 전경: 도리이(Torii) 대형 붉은 정문 기둥 (Left Post) */}
                {/* 기둥 석제 초석 */}
                <rect x="255" y="550" width="50" height="50" rx="3" fill="currentColor" opacity="0.35" />
                <rect x="255" y="550" width="50" height="50" rx="3" stroke="var(--accent-light)" strokeWidth="2.5" opacity="0.6" />
                {/* 둥근 기둥 기둥 본체 */}
                <rect x="265" y="120" width="30" height="430" rx="4" fill="currentColor" opacity="0.25" />
                <rect x="265" y="120" width="30" height="430" rx="4" stroke="var(--accent-light)" strokeWidth="3" opacity="0.7" />
                {/* 가로 기둥 보 (Nuki) */}
                <rect x="220" y="210" width="45" height="18" fill="currentColor" fillOpacity="0.25" stroke="var(--accent-light)" strokeWidth="2" strokeOpacity="0.6" />
                <line x1="220" y1="219" x2="265" y2="219" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
              </svg>
            </div>
            {/* 오른쪽 절반 (나뭇잎 마을 정문 우측 건물 + 홍살문/도리이 기둥) */}
            <div className="absolute right-0 bottom-0" style={{ height: "55vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMaxYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 배경 나뭇잎/나무 실루엣 */}
                <path
                  d="M 320,280 Q 280,240 250,260 T 180,230 T 140,270 Q 110,310 130,360 L 320,400 Z"
                  fill="currentColor"
                  opacity="0.1"
                />
                <path
                  d="M 320,150 Q 270,110 230,130 T 160,110 T 120,160 Q 90,220 120,260 L 320,300 Z"
                  fill="currentColor"
                  opacity="0.08"
                />
                
                {/* gabled 건물 본체 실루엣 */}
                <path
                  d="M 320,600 L 100,600 L 100,450 L 120,260 L 220,170 L 320,220 Z"
                  fill="currentColor"
                  opacity="0.15"
                />
                
                {/* gabled 지붕 (Gabled Upper Roof) */}
                <path
                  d="M 100,260 L 200,175 L 320,225 L 320,238 L 200,188 L 100,273 Z"
                  fill="currentColor"
                  opacity="0.25"
                />
                <path
                  d="M 100,260 L 200,175 L 320,225 L 320,238 L 200,188 L 100,273 Z"
                  stroke="var(--accent-light)"
                  strokeWidth="2"
                  opacity="0.6"
                />
                {/* 서까래 기와선 (Rafters) */}
                <line x1="120" y1="243" x2="120" y2="256" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="150" y1="217" x2="150" y2="230" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="180" y1="192" x2="180" y2="205" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="210" y1="192" x2="210" y2="205" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="240" y1="202" x2="240" y2="215" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="270" y1="212" x2="270" y2="225" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />

                {/* 1층 처마 지붕 (Lower Awning) */}
                <path
                  d="M 80,410 L 320,350 L 320,363 L 80,423 Z"
                  fill="currentColor"
                  opacity="0.25"
                />
                <path
                  d="M 80,410 L 320,350 L 320,363 L 80,423 Z"
                  stroke="var(--accent-light)"
                  strokeWidth="2"
                  opacity="0.6"
                />

                {/* 기둥 및 벽 프레임 */}
                {/* 2층 벽선 및 창문 */}
                <line x1="150" y1="217" x2="150" y2="360" stroke="var(--accent-light)" strokeWidth="1.5" opacity="0.5" />
                <line x1="240" y1="202" x2="240" y2="350" stroke="var(--accent-light)" strokeWidth="1.5" opacity="0.5" />
                
                {/* 2층 격자무늬 미닫이창 (Sliding screen window) */}
                <rect x="170" y="240" width="50" height="40" stroke="var(--accent-light)" strokeWidth="1.2" opacity="0.45" />
                <line x1="195" y1="240" x2="195" y2="280" stroke="var(--accent-light)" strokeWidth="0.8" opacity="0.4" />
                <line x1="170" y1="260" x2="220" y2="260" stroke="var(--accent-light)" strokeWidth="0.8" opacity="0.4" />

                {/* 1층 기둥 */}
                <line x1="110" y1="418" x2="110" y2="600" stroke="var(--accent-light)" strokeWidth="2" opacity="0.5" />
                <line x1="180" y1="400" x2="180" y2="600" stroke="var(--accent-light)" strokeWidth="2" opacity="0.5" />
                <line x1="260" y1="380" x2="260" y2="600" stroke="var(--accent-light)" strokeWidth="2" opacity="0.5" />

                {/* 1층 포렴/노렌 장식 (Noren Shop curtains) */}
                <rect x="110" y="440" width="150" height="35" fill="currentColor" opacity="0.2" stroke="var(--accent-light)" strokeWidth="1.2" />
                {/* 갈라지는 부분 표시 세로선 */}
                <line x1="147.5" y1="440" x2="147.5" y2="475" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="185" y1="440" x2="185" y2="475" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
                <line x1="222.5" y1="440" x2="222.5" y2="475" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />

                {/* 전경: 도리이(Torii) 대형 붉은 정문 기둥 (Right Post) */}
                {/* 기둥 석제 초석 */}
                <rect x="15" y="550" width="50" height="50" rx="3" fill="currentColor" opacity="0.35" />
                <rect x="15" y="550" width="50" height="50" rx="3" stroke="var(--accent-light)" strokeWidth="2.5" opacity="0.6" />
                {/* 둥근 기둥 기둥 본체 */}
                <rect x="25" y="120" width="30" height="430" rx="4" fill="currentColor" opacity="0.25" />
                <rect x="25" y="120" width="30" height="430" rx="4" stroke="var(--accent-light)" strokeWidth="3" opacity="0.7" />
                {/* 가로 기둥 보 (Nuki) */}
                <rect x="55" y="210" width="45" height="18" fill="currentColor" fillOpacity="0.25" stroke="var(--accent-light)" strokeWidth="2" strokeOpacity="0.6" />
                <line x1="55" y1="219" x2="100" y2="219" stroke="var(--accent-light)" strokeWidth="1" opacity="0.4" />
              </svg>
            </div>
          </div>
        </>
      )}

      {/* 비 마을 빗줄기 및 배경 건물 */}
      {theme === "rain" && (
        <>
          <div className="ame-rain-layer" aria-hidden>
            {RAIN_DROPS.map((d, i) => (
              <div key={i} className="ame-rain-drop" style={{
                left: d.left, height: d.height,
                animationDuration: d.duration, animationDelay: d.delay, opacity: d.opacity,
              }} />
            ))}
          </div>
          {/* 비 마을 배경 건물 (고정형 구조물 2개) */}
          <div className="ame-bg-buildings pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.16, color: "var(--border-green)" }}>
            {/* Left Tower */}
            <div className="absolute left-0 bottom-0" style={{ height: "65vh", width: "180px" }}>
              <svg width="100%" height="100%" viewBox="0 0 200 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="40" y="250" width="60" height="350" fill="currentColor" opacity="0.3"/>
                <rect x="50" y="150" width="40" height="100" fill="currentColor" opacity="0.4"/>
                <rect x="65" y="50" width="10" height="100" fill="currentColor" opacity="0.5"/>
                <line x1="70" y1="50" x2="70" y2="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="60" y1="25" x2="80" y2="25" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="63" y1="35" x2="77" y2="35" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M 40,280 C 10,280 10,400 40,400" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path d="M 40,290 C 18,290 18,390 40,390" stroke="currentColor" strokeWidth="2" fill="none"/>
                <line x1="100" y1="300" x2="160" y2="350" stroke="currentColor" strokeWidth="3"/>
                <line x1="100" y1="350" x2="160" y2="300" stroke="currentColor" strokeWidth="3"/>
                <line x1="160" y1="300" x2="160" y2="600" stroke="currentColor" strokeWidth="3"/>
                <line x1="40" y1="280" x2="100" y2="280" stroke="var(--bg)" strokeWidth="2"/>
                <line x1="40" y1="340" x2="100" y2="340" stroke="var(--bg)" strokeWidth="2"/>
                <line x1="40" y1="400" x2="100" y2="400" stroke="var(--bg)" strokeWidth="2"/>
                <line x1="40" y1="480" x2="100" y2="480" stroke="var(--bg)" strokeWidth="2"/>
                <line x1="40" y1="550" x2="100" y2="550" stroke="var(--bg)" strokeWidth="2"/>
                <path d="M 0,200 Q 50,230 100,200" stroke="currentColor" strokeWidth="1" strokeDasharray="3,3" fill="none"/>
                <path d="M 0,220 Q 50,250 100,220" stroke="currentColor" strokeWidth="0.8" fill="none"/>
              </svg>
            </div>
            {/* Right Tower */}
            <div className="absolute right-0 bottom-0" style={{ height: "75vh", width: "220px" }}>
              <svg width="100%" height="100%" viewBox="0 0 250 700" preserveAspectRatio="xMaxYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="100" y="200" width="50" height="500" fill="currentColor" opacity="0.3"/>
                <rect x="110" y="100" width="30" height="100" fill="currentColor" opacity="0.4"/>
                <circle cx="125" cy="220" r="35" fill="currentColor" opacity="0.45"/>
                <circle cx="125" cy="220" r="35" stroke="var(--bg)" strokeWidth="2" fill="none"/>
                <path d="M 150,300 C 220,300 220,450 150,450" stroke="currentColor" strokeWidth="5" fill="none"/>
                <path d="M 150,312 C 205,312 205,438 150,438" stroke="currentColor" strokeWidth="2.5" fill="none"/>
                <line x1="125" y1="100" x2="125" y2="20" stroke="currentColor" strokeWidth="2"/>
                <line x1="115" y1="40" x2="135" y2="40" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="120" y1="60" x2="130" y2="60" stroke="currentColor" strokeWidth="1.5"/>
                <line x1="100" y1="280" x2="30" y2="350" stroke="currentColor" strokeWidth="2"/>
                <line x1="100" y1="350" x2="30" y2="280" stroke="currentColor" strokeWidth="2"/>
                <line x1="30" y1="280" x2="30" y2="700" stroke="currentColor" strokeWidth="2.5"/>
                <line x1="30" y1="380" x2="100" y2="450" stroke="currentColor" strokeWidth="2"/>
                <line x1="30" y1="450" x2="100" y2="380" stroke="currentColor" strokeWidth="2"/>
                <line x1="100" y1="300" x2="150" y2="300" stroke="var(--bg)" strokeWidth="2"/>
                <line x1="100" y1="380" x2="150" y2="380" stroke="var(--bg)" strokeWidth="2"/>
                <line x1="100" y1="480" x2="150" y2="480" stroke="var(--bg)" strokeWidth="2"/>
                <line x1="100" y1="580" x2="150" y2="580" stroke="var(--bg)" strokeWidth="2"/>
                <path d="M 100,150 Q 50,180 0,160" stroke="currentColor" strokeWidth="0.8" fill="none"/>
                <path d="M 100,165 Q 50,195 0,175" stroke="currentColor" strokeWidth="0.8" fill="none"/>
              </svg>
            </div>
          </div>
        </>
      )}

      {/* 아카츠키 붉은 구름 및 배경 구조물 */}
      {theme === "aka" && (
        <>
          <div className="aka-cloud-layer" aria-hidden>
            {AKA_CLOUDS.map((c, i) => (
              <AkaCloud key={i} scale={c.scale} style={{
                top: c.top,
                left: c.left,
                right: c.right,
                animationDuration: c.duration,
                animationDelay: c.delay,
                opacity: c.opacity,
              }} />
            ))}
          </div>
          {/* 아카츠키 배경 구조물 (좌우 코너) */}
          <div className="aka-bg-structures pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.22, color: "var(--accent)" }}>
            {/* Left Structure */}
            <div className="absolute left-0 bottom-0" style={{ height: "55vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Main Silhouette of the Left Arch */}
                <path
                  d="M 0,600 L 220,600 C 200,450 160,320 100,220 C 60,150 30,100 40,30 C 25,60 10,120 0,160 Z"
                  fill="currentColor"
                  opacity="0.25"
                />
                <path
                  d="M 0,600 L 220,600 C 200,450 160,320 100,220 C 60,150 30,100 40,30 C 25,60 10,120 0,160 Z"
                  stroke="var(--border-green)"
                  strokeWidth="2.5"
                  opacity="0.6"
                />
                {/* Mechanical panels & rivets */}
                <line x1="80" y1="250" x2="0" y2="350" stroke="var(--border-green)" strokeWidth="1.5" opacity="0.4" />
                <line x1="130" y1="330" x2="30" y2="480" stroke="var(--border-green)" strokeWidth="1.5" opacity="0.4" />
                <circle cx="60" cy="180" r="16" fill="var(--bg)" />
                <circle cx="60" cy="180" r="16" stroke="var(--border-green)" strokeWidth="2" opacity="0.6" />
                <line x1="0" y1="280" x2="160" y2="280" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <line x1="0" y1="420" x2="200" y2="420" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                {/* Industrial pipe details */}
                <line x1="20" y1="180" x2="20" y2="600" stroke="currentColor" strokeWidth="4" opacity="0.4" />
                <line x1="26" y1="180" x2="26" y2="600" stroke="var(--border-green)" strokeWidth="1" opacity="0.4" />
              </svg>
            </div>
            {/* Right Structure */}
            <div className="absolute right-0 bottom-0" style={{ height: "55vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMaxYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Main Silhouette of the Right Curved Claw */}
                <path
                  d="M 320,600 L 100,600 C 120,450 160,320 220,220 C 260,150 290,100 280,30 C 295,60 310,120 320,160 Z"
                  fill="currentColor"
                  opacity="0.25"
                />
                <path
                  d="M 320,600 L 100,600 C 120,450 160,320 220,220 C 260,150 290,100 280,30 C 295,60 310,120 320,160 Z"
                  stroke="var(--border-green)"
                  strokeWidth="2.5"
                  opacity="0.6"
                />
                {/* Mechanical panels & rivets */}
                <line x1="240" y1="250" x2="320" y2="350" stroke="var(--border-green)" strokeWidth="1.5" opacity="0.4" />
                <line x1="190" y1="330" x2="290" y2="480" stroke="var(--border-green)" strokeWidth="1.5" opacity="0.4" />
                <circle cx="260" cy="180" r="16" fill="var(--bg)" />
                <circle cx="260" cy="180" r="16" stroke="var(--border-green)" strokeWidth="2" opacity="0.6" />
                <line x1="320" y1="280" x2="160" y2="280" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                <line x1="320" y1="420" x2="120" y2="420" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                {/* Industrial pipe details */}
                <line x1="300" y1="180" x2="300" y2="600" stroke="currentColor" strokeWidth="4" opacity="0.4" />
                <line x1="294" y1="180" x2="294" y2="600" stroke="var(--border-green)" strokeWidth="1" opacity="0.4" />
              </svg>
            </div>
          </div>
        </>
      )}

      <header style={{
        background: "var(--panel)",
        borderBottom: "1px solid var(--border)",
        boxShadow: theme === "aka"
          ? "0 1px 12px rgba(180,0,0,0.3)"
          : theme === "rain"
          ? "0 1px 12px rgba(139,92,246,0.2)"
          : "0 1px 4px rgba(0,0,0,0.06)",
        position: "relative",
        zIndex: 40,   // 메인 컨텐츠(z-10)보다 높아야 드롭다운이 위에 표시됨
      }}>
        {/* 쿠나이 장식 */}
        {["left-6", "right-6"].map(side => (
          <div key={side} className={`absolute top-1/2 ${side} -translate-y-1/2 pointer-events-none hidden xl:block`} style={{ opacity: 0.5 }}>
            <svg width="22" height="100" viewBox="0 0 24 110">
              <polygon points="12,2 5,38 12,32 19,38" fill="#64748b"/>
              <line x1="12" y1="2" x2="12" y2="32" stroke="#94a3b8" strokeWidth="0.8"/>
              <rect x="3" y="38" width="18" height="5" rx="1.5" fill="#475569"/>
              <rect x="8" y="43" width="8" height="42" rx="2" fill="#64748b"/>
              {[51,59,67,75].map(y => (
                <line key={y} x1="8" y1={y} x2="16" y2={y} stroke="#1e293b" strokeWidth="1.2" strokeOpacity="0.5"/>
              ))}
              <circle cx="12" cy="95" r="8" fill="none" stroke="#64748b" strokeWidth="2"/>
              <circle cx="12" cy="95" r="4" fill="none" stroke="#94a3b8" strokeWidth="1"/>
            </svg>
          </div>
        ))}

        <div className="max-w-6xl mx-auto px-4" style={{ position: "relative" }}>
          {/* 타이틀 */}
          <div className="pt-5 pb-2 text-center relative">
            <div className="text-2xl mb-1"
              style={theme === "aka" ? { filter: "sepia(1) saturate(8) hue-rotate(310deg) brightness(0.85)" } : undefined}>
              {cur.icon}
            </div>
            <h1 className="text-xl font-black tracking-wide" style={{ color: cur.accentColor }}>
              {cur.title}
            </h1>
            <div className="flex items-center justify-center gap-3 mt-1">
              <div style={{ height: "1px", width: "60px", background: `linear-gradient(90deg, transparent, var(--border-green))` }} />
              <span className="text-sm" style={{ color: "var(--text-dim)" }}>{cur.subtitle}</span>
              <div style={{ height: "1px", width: "60px", background: `linear-gradient(90deg, var(--border-green), transparent)` }} />
            </div>

            {/* 유저 메뉴 */}
            {session?.user && (
              <div ref={userMenuRef} className="absolute left-0 top-1/2 -translate-y-1/2" style={{ zIndex: 60 }}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-150 hover:scale-[1.03]"
                  style={{
                    background: userMenuOpen ? "var(--hover)" : "transparent",
                    border: "1px solid var(--border)",
                  }}>
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ background: "var(--accent)", color: "#fff" }}>
                      {(session.user.name ?? session.user.email ?? "?")[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-semibold hidden sm:block" style={{ color: "var(--text-muted)", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {session.user.name ?? session.user.email}
                  </span>
                  <svg width="10" height="10" viewBox="0 0 10 10" style={{ color: "var(--text-dim)", transition: "transform 0.2s", transform: userMenuOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
                    <path d="M1 3 L5 7 L9 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                {userMenuOpen && (
                  <div className="absolute left-0 mt-1.5 rounded-xl overflow-hidden"
                    style={{ background: "var(--panel)", border: "1px solid var(--border)", minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.3)" }}>
                    <Link href="/manage"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition-all hover:bg-white/5"
                      style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                      🏕️ <span>마을 관리</span>
                    </Link>
                    <Link href="/guide"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-3 text-sm font-semibold transition-all hover:bg-white/5"
                      style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>
                      📖 <span>사용 가이드</span>
                    </Link>
                    <button
                      onClick={() => { setUserMenuOpen(false); signOut({ callbackUrl: "/" }); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm font-semibold text-left transition-all hover:bg-white/5"
                      style={{ color: "#ef4444" }}>
                      🚪 <span>로그아웃</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 테마 셀렉터 */}
            <div ref={dropdownRef} className="absolute right-0 top-1/2 -translate-y-1/2" style={{ zIndex: 60 }}>
              <button
                onClick={() => setDropdownOpen(v => !v)}
                className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: "var(--hover)",
                  color: "var(--text-muted)",
                  border: "1px solid var(--border)",
                }}>
                <span>{cur.icon}</span>
                <span>{cur.name}</span>
                <span style={{ fontSize: 8, opacity: 0.7 }}>{dropdownOpen ? "▲" : "▼"}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1 rounded-xl overflow-hidden shadow-2xl"
                  style={{
                    background: "var(--panel)",
                    border: "1px solid var(--border)",
                    minWidth: 160,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                  }}>
                  {THEMES.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-left transition-all"
                      style={{
                        background: theme === t.id ? t.accentColor + "22" : "transparent",
                        color: theme === t.id ? t.accentColor : "var(--text-muted)",
                        borderBottom: i < THEMES.length - 1 ? "1px solid var(--border)" : "none",
                      }}>
                      <span style={{ fontSize: 16, ...(t.id === "aka" ? { filter: "sepia(1) saturate(8) hue-rotate(310deg) brightness(0.85)" } : {}) }}>{t.icon}</span>
                      <span style={{ whiteSpace: "nowrap" }}>{t.name}</span>
                      {theme === t.id && <span style={{ marginLeft: "auto", fontSize: 10 }}>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 네비게이션 */}
          <nav className="flex justify-center gap-0 pb-0">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link key={item.href} href={item.href}
                  className="px-5 py-3 text-sm font-semibold transition-all duration-150 flex items-center gap-1.5"
                  style={{
                    color: isActive ? "var(--accent)" : "var(--text-muted)",
                    borderBottom: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                    background: isActive ? "var(--hover)" : "transparent",
                  }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div style={{
            height: "2px",
            background: theme === "aka"
              ? "linear-gradient(to right, transparent 5%, var(--accent-dark) 30%, var(--accent) 50%, var(--accent-dark) 70%, transparent 95%)"
              : "linear-gradient(to right, transparent 5%, #C8971A 30%, #2A5C1E 50%, #C8971A 70%, transparent 95%)",
            opacity: 0.55,
          }} />
        </div>
      </header>
    </>
  );
}
