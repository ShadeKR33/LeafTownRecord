"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useSession, signOut } from "next-auth/react";

// ── 테마 정의 ──────────────────────────────────────────────────
type ThemeId = "leaf" | "rain" | "aka" | "sand" | "cloud" | "hideout" | "myoboku" | "anbu" | "orochimaru";

const ALL_THEMES: { id: ThemeId; name: string; icon: string; title: string; subtitle: string; accentColor: string }[] = [
  { id: "leaf", name: "나뭇잎 마을", icon: "🍃", title: "나뭇잎 마을 내전 기록소", subtitle: "(상급닌자 제1시험)", accentColor: "#2A5C1E" },
  { id: "rain", name: "비 마을",     icon: "🌧️", title: "비 마을 내전 기록소",     subtitle: "(페인의 시험)",      accentColor: "#9d92d4" },
  { id: "aka",  name: "아카츠키",    icon: "🌕", title: "아카츠키 전쟁 기록소",    subtitle: "(달의 눈 계획)",     accentColor: "#c93b3b" },
  { id: "sand", name: "모래 마을",    icon: "🏜️", title: "모래 마을 내전 기록소",    subtitle: "(카제카게의 시험)",     accentColor: "#b27c30" },
  { id: "cloud", name: "구름 마을",   icon: "⚡", title: "구름 마을 내전 기록소",    subtitle: "(라이카게의 시험)",     accentColor: "#1d4ed8" },
  { id: "hideout", name: "지하 아지트", icon: "👁️", title: "우치하 지하 아지트",    subtitle: "(일족의 비밀석판)",     accentColor: "#dc2626" },
  { id: "myoboku", name: "묘목산", icon: "🐸", title: "묘목산",    subtitle: "(선인모드 수련)",     accentColor: "#166534" },
  { id: "anbu", name: "암부", icon: "🎭", title: "암살전술 특수부대", subtitle: "(그림자 가면 분배소)",   accentColor: "#0891b2" },
  { id: "orochimaru", name: "비밀 실험실", icon: "🧪", title: "오로치마루 비밀실험실", subtitle: "(금단의 연구소)",     accentColor: "#a855f7" },
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

// ── 모래 마을 모래바람 입자 ──────────────────────────────────────────
const SAND_GRAINS = Array.from({ length: 30 }, (_, i) => ({
  top: `${(i * 3.3 + (i % 4) * 2.5) % 100}%`,
  left: `${-10 - (i % 5) * 5}%`,
  width: `${2 + (i % 4) * 2}px`,
  height: `${2 + (i % 4) * 2}px`,
  duration: `${3 + (i % 3) * 1.5}s`,
  delay: `${(i % 10) * 0.4}s`,
}));

// ── 구름 마을 둥실 구름 ──────────────────────────────────────────
const CLOUD_MISTS = Array.from({ length: 8 }, (_, i) => ({
  top: `${15 + (i * 12 + (i % 2) * 5) % 60}%`,
  left: `${-30 - (i % 3) * 10}%`,
  width: `${250 + (i % 4) * 80}px`,
  height: `${80 + (i % 3) * 30}px`,
  duration: `${25 + (i % 3) * 10}s`,
  delay: `${(i % 5) * 4}s`,
  opacity: 0.18 + (i % 3) * 0.06,
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

// ── 우치하 지하아지트 까마귀 깃털 & 불씨 데이터 ─────────────────────────
const HIDEOUT_FEATHERS = Array.from({ length: 15 }, (_, i) => ({
  left: `${(i * 7 + (i % 3) * 4) % 100}%`,
  delay: `${(i % 5) * 1.6}s`,
  duration: `${6.5 + (i % 3) * 2}s`,
  scale: 0.65 + (i % 4) * 0.2,
}));
const HIDEOUT_EMBERS = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 5.5 + (i % 4) * 3) % 100}%`,
  delay: `${(i % 6) * 1.0}s`,
  duration: `${4.5 + (i % 3) * 1.5}s`,
  size: 7 + (i % 4) * 3,
}));

// ── 묘목산 선술 에너지 구체 데이터 ─────────────────────────────────────
const MYOBOKU_SPARKS = Array.from({ length: 25 }, (_, i) => ({
  left: `${(i * 4 + (i % 3) * 5) % 100}%`,
  delay: `${(i % 5) * 1.4}s`,
  duration: `${5.5 + (i % 4) * 2}s`,
  size: 8 + (i % 3) * 4,
  color: i % 2 === 0 ? "radial-gradient(circle, #fef08a 20%, #84cc16 80%)" : "radial-gradient(circle, #fef08a 20%, #eab308 80%)",
  shadow: i % 2 === 0 ? "0 0 8px #a3e635" : "0 0 8px #facc15",
}));

// 독성 가스 기포: 동그란 물방울 대신 위로 피어오르는 독연기 와이프 형태로 표현
const OROCHI_BUBBLES = Array.from({ length: 20 }, (_, i) => ({
  left: `${(i * 5.2 + (i % 3) * 4.5) % 100}%`,
  delay: `${(i % 5) * 1.5}s`,
  duration: `${9.0 + (i % 4) * 2.5}s`,
  width: 18 + (i % 4) * 8, // 18px ~ 42px
  height: 36 + (i % 4) * 18, // 36px ~ 90px, 세로로 길쭉한 연기 형태
  background: i % 2 === 0
    ? "linear-gradient(0deg, rgba(190, 242, 100, 0) 0%, rgba(190, 242, 100, 0.45) 35%, rgba(132, 204, 22, 0.35) 70%, rgba(132, 204, 22, 0) 100%)"
    : "linear-gradient(0deg, rgba(216, 180, 254, 0) 0%, rgba(216, 180, 254, 0.45) 35%, rgba(168, 85, 247, 0.3) 70%, rgba(168, 85, 247, 0) 100%)",
  boxShadow: i % 2 === 0
    ? "0 0 18px rgba(190, 242, 100, 0.35)"
    : "0 0 18px rgba(168, 85, 247, 0.4)",
}));


export default function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [theme, setTheme] = useState<ThemeId>("leaf");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [unlockedThemes, setUnlockedThemes] = useState<ThemeId[]>([]);
  const [unlockModalData, setUnlockModalData] = useState<{
    id: ThemeId;
    name: string;
    icon: string;
    color: string;
    desc: string;
    flavor: string;
  } | null>(null);

  // 이스터에그 해금 상태 스캔 및 커스텀 이벤트 바인딩
  useEffect(() => {
    const ALL_EASTER_THEMES: ThemeId[] = ["hideout", "myoboku", "anbu", "orochimaru"];

    const checkUnlocked = () => {
      const suffix = session?.user?.id ? `_${session.user.id}` : "_guest";
      const unlocked = ALL_EASTER_THEMES.filter(id =>
        localStorage.getItem(`theme_unlocked_${id}${suffix}`) === "true"
      );
      setUnlockedThemes(unlocked);

      // 4개 모두 해금 시 서버에 기록 (리미티드 칭호 "전설의 탐험가")
      if (unlocked.length === ALL_EASTER_THEMES.length) {
        fetch("/api/easter-eggs", { method: "POST" }).catch(() => {});
      }
    };

    checkUnlocked();

    window.addEventListener("theme_unlocked", checkUnlocked);

    const handleShowModal = (e: Event) => {
      setUnlockModalData((e as CustomEvent).detail);
    };
    window.addEventListener("show_unlock_modal", handleShowModal);

    return () => {
      window.removeEventListener("theme_unlocked", checkUnlocked);
      window.removeEventListener("show_unlock_modal", handleShowModal);
    };
  }, [session]);

  // 키보드 타이핑 감지 (우치하 지하 아지트) — 영문 및 한글 자모 모두 지원
  useEffect(() => {
    let buffer = "";
    let korBuffer = "";

    const triggerHideout = () => {
      const suffix = session?.user?.id ? `_${session.user.id}` : "_guest";
      if (localStorage.getItem(`theme_unlocked_hideout${suffix}`) !== "true") {
        localStorage.setItem(`theme_unlocked_hideout${suffix}`, "true");
        localStorage.setItem("theme", "hideout");
        setTheme("hideout");
        window.dispatchEvent(new CustomEvent("theme_unlocked"));
        window.dispatchEvent(new CustomEvent("themechange", { detail: "hideout" }));
        window.dispatchEvent(new CustomEvent("show_unlock_modal", {
          detail: {
            id: "hideout",
            name: "우치하 지하 아지트",
            icon: "👁️",
            color: "#dc2626",
            desc: "일족의 운명과 비밀이 석판에 새겨진 어둠의 아지트",
            flavor: "어둠 속에서 진실의 눈을 뜨기 위해 일족과 형제들의 이름(우치하 / 이타치 / 사스케)을 타이핑하여 지하 아지트를 해금했습니다.\n회색조 배경 위에 핏빛처럼 붉은 사륜안 문양과 그림자가 드리우며, 긴장감 넘치는 비장한 분위기를 자아냅니다."
          }
        }));
      }
      buffer = "";
      korBuffer = "";
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key && e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
        buffer = (buffer + e.key.toLowerCase()).slice(-20);
        if (buffer.endsWith("uchiha") || buffer.endsWith("itachi") || buffer.endsWith("sasuke")) {
          triggerHideout();
        }
      } else if (e.key && /^[ㄱ-ㅣ]$/.test(e.key)) {
        // 한글 자모: 이타치=ㅇㅣㅌㅏㅊㅣ, 사스케=ㅅㅏㅅㅡㅋㅔ, 우치하=ㅇㅜㅊㅣㅎㅏ
        korBuffer = (korBuffer + e.key).slice(-20);
        if (
          korBuffer.endsWith("ㅇㅣㅌㅏㅊㅣ") ||
          korBuffer.endsWith("ㅅㅏㅅㅡㅋㅔ") ||
          korBuffer.endsWith("ㅇㅜㅊㅣㅎㅏ")
        ) {
          triggerHideout();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [session]);

  const handleMyobokuUnlock = () => {
    const suffix = session?.user?.id ? `_${session.user.id}` : "_guest";
    if (localStorage.getItem(`theme_unlocked_myoboku${suffix}`) !== "true") {
      localStorage.setItem(`theme_unlocked_myoboku${suffix}`, "true");
      localStorage.setItem("theme", "myoboku");
      setTheme("myoboku");
      window.dispatchEvent(new CustomEvent("theme_unlocked"));
      window.dispatchEvent(new CustomEvent("themechange", { detail: "myoboku" }));
      window.dispatchEvent(new CustomEvent("show_unlock_modal", {
        detail: {
          id: "myoboku",
          name: "묘목산",
          icon: "🐸",
          color: "#166534",
          desc: "선인모드 수련",
          flavor: "나뭇잎 마을 테마에서 바람에 흩날리는 신비로운 나뭇잎을 포착하여 묘목산 테마를 해금했습니다.\n연두색과 황토색의 선술 기름이 세차게 흘러내리는 폭포와 나뭇잎 우산을 머리에 쓴 거대한 두꺼비 석상이 눈앞에 장엄하게 펼쳐집니다."
        }
      }));
    }
  };

  const selectableThemes = ALL_THEMES.filter(t => {
    if (["leaf", "rain", "aka", "sand", "cloud"].includes(t.id)) return true;
    return unlockedThemes.includes(t.id);
  });

  useEffect(() => {
    const saved = (localStorage.getItem("theme") as ThemeId) || "leaf";
    setTheme(saved);

    const handler = (e: Event) => {
      const id = (e as CustomEvent<ThemeId>).detail;
      setTheme(id);
    };
    window.addEventListener("themechange", handler);
    return () => window.removeEventListener("themechange", handler);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    // 모든 테마 관련 클래스를 깨끗이 제거합니다.
    html.classList.remove(
      "ame-mode",
      "aka-mode",
      "sand-mode",
      "cloud-mode",
      "hideout-mode",
      "myoboku-mode",
      "anbu-mode",
      "orochimaru-mode"
    );
    if (theme === "rain") html.classList.add("ame-mode");
    else if (theme === "aka") html.classList.add("aka-mode");
    else if (theme !== "leaf") html.classList.add(`${theme}-mode`);
    
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

  const cur = ALL_THEMES.find(t => t.id === theme) || ALL_THEMES[0];

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
          {/* 🍃 묘목산 선보 테마 해금용 날아다니는 나뭇잎 3개 (나뭇잎 마을 테마일 때만 표시) */}
          <div className="fixed inset-0 pointer-events-none z-30" aria-hidden="true">
            <div className="leaf-float absolute" style={{ top: "25%", left: "12%", pointerEvents: "auto", fontSize: "28px" }} onClick={handleMyobokuUnlock} title="신비로운 나뭇잎">🍃</div>
            <div className="leaf-float absolute" style={{ top: "45%", right: "18%", pointerEvents: "auto", fontSize: "22px", animationDelay: "1.2s" }} onClick={handleMyobokuUnlock} title="신비로운 나뭇잎">🍃</div>
            <div className="leaf-float absolute" style={{ top: "75%", left: "38%", pointerEvents: "auto", fontSize: "26px", animationDelay: "2.4s" }} onClick={handleMyobokuUnlock} title="신비로운 나뭇잎">🍃</div>
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

      {/* 모래 마을 배경 (카제카게 집무실과 원형 돔형 가옥들) */}
      {theme === "sand" && (
        <>
          <div className="sand-wind-layer" aria-hidden>
            {SAND_GRAINS.map((g, i) => (
              <div key={i} className="sand-grain" style={{
                top: g.top,
                left: g.left,
                width: g.width,
                height: g.height,
                animationDuration: g.duration,
                animationDelay: g.delay,
              }} />
            ))}
          </div>
          <div className="sand-bg-structures pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.32, color: "var(--accent)" }}>
            {/* Left Side: 모래 마을 카제카게 집무실 관저와 돔형 건물들 */}
            <div className="absolute left-0 bottom-0" style={{ height: "60vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* 모래/황토/점토 재질 그라디언트 */}
                  <linearGradient id="sandBase" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="60%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>
                  <linearGradient id="sandHighlight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="sandDark" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78350f" />
                    <stop offset="100%" stopColor="#451a03" />
                  </linearGradient>
                  <linearGradient id="sandCliff" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#78350f" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#451a03" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* 계곡 사막 바위 절벽 배경 */}
                <path d="M 0,0 L 90,0 Q 80,150 110,300 Q 95,450 70,600 L 0,600 Z" fill="url(#sandCliff)" />
                <path d="M 0,120 Q 75,200 65,350 Q 80,480 60,600" stroke="#78350f" strokeWidth="1.5" opacity="0.4" fill="none" />

                {/* 뒤쪽 원형 돔 가옥 1 (왼쪽) */}
                <path d="M 15,380 L 80,380 L 80,600 L 15,600 Z" fill="url(#sandBase)" stroke="#78350f" strokeWidth="2.5" />
                <path d="M 15,380 C 15,330 80,330 80,380 Z" fill="url(#sandHighlight)" stroke="#78350f" strokeWidth="2" />
                <circle cx="47.5" cy="340" r="8" fill="url(#sandBase)" stroke="#78350f" strokeWidth="1.5" />
                
                {/* 돔 가옥 1 창문 */}
                <rect x="26" y="410" width="12" height="6" fill="#451a03" rx="1.2" />
                <rect x="44" y="410" width="12" height="6" fill="#451a03" rx="1.2" />
                <rect x="62" y="410" width="12" height="6" fill="#451a03" rx="1.2" />
                <rect x="26" y="450" width="12" height="6" fill="#451a03" rx="1.2" />
                <rect x="44" y="450" width="12" height="6" fill="#451a03" rx="1.2" />
                <rect x="62" y="450" width="12" height="6" fill="#451a03" rx="1.2" />
                <rect x="35" y="500" width="25" height="35" fill="#451a03" rx="4" />

                {/* 중앙 전경: 모래 마을 카제카게 집무실 관저 (원형 구체 형태) */}
                {/* 지지대 기둥들 */}
                <line x1="120" y1="440" x2="100" y2="600" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
                <line x1="145" y1="450" x2="135" y2="600" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
                <line x1="175" y1="450" x2="185" y2="600" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />
                <line x1="200" y1="440" x2="220" y2="600" stroke="#78350f" strokeWidth="6" strokeLinecap="round" />

                {/* 집무실 하단 구조 고리 */}
                <ellipse cx="160" cy="435" rx="70" ry="18" fill="url(#sandBase)" stroke="#78350f" strokeWidth="2.5" />
                <ellipse cx="160" cy="435" rx="55" ry="12" fill="url(#sandDark)" />

                {/* 집무실 구체 본체 */}
                <circle cx="160" cy="380" r="50" fill="url(#sandBase)" stroke="#78350f" strokeWidth="3" />
                <path d="M 160,330 A 50 50 0 0 1 210,380 A 50 50 0 0 1 160,430 Z" fill="#451a03" opacity="0.25" /> {/* 3D 음영 */}
                
                {/* 상단 타워 및 안테나 */}
                <rect x="154" y="305" width="12" height="26" fill="url(#sandHighlight)" stroke="#78350f" strokeWidth="2" />
                <circle cx="160" cy="305" r="8" fill="url(#sandBase)" stroke="#78350f" strokeWidth="2" />
                <line x1="160" y1="297" x2="160" y2="280" stroke="#78350f" strokeWidth="2.5" />
                <circle cx="160" cy="278" r="3" fill="#fef08a" />

                {/* 중앙 '風' (바람 풍) 카제카게 징표 원형 씰 */}
                <circle cx="160" cy="380" r="18" fill="#fef08a" stroke="#b45309" strokeWidth="2.2" />
                <text x="160" y="386" fill="#78350f" fontSize="18" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">風</text>

                {/* 집무실 창문 슬릿 */}
                <path d="M 122,408 Q 160,418 198,408" stroke="#451a03" strokeWidth="4.5" strokeLinecap="round" fill="none" />
                <path d="M 127,352 Q 160,362 193,352" stroke="#451a03" strokeWidth="3.5" strokeLinecap="round" fill="none" />

                {/* 앞쪽 항아리형 가옥 (가장 왼쪽 앞) */}
                <path d="M 60,480 C 42,490 38,530 48,550 L 112,550 C 122,530 118,490 100,480 Z" fill="url(#sandBase)" stroke="#78350f" strokeWidth="2" />
                <ellipse cx="80" cy="480" rx="20" ry="10" fill="url(#sandHighlight)" stroke="#78350f" strokeWidth="2" />
                <circle cx="80" cy="466" r="6" fill="url(#sandBase)" stroke="#78350f" strokeWidth="1" />
                {/* 돌출창 */}
                <rect x="70" y="505" width="20" height="15" fill="url(#sandDark)" stroke="#78350f" strokeWidth="1.2" rx="1.5" />
                <rect x="75" y="509" width="10" height="7" fill="#fef9c3" />
                <rect x="48" y="550" width="64" height="50" fill="url(#sandDark)" />

                {/* 모래바람 휘날리는 선 애니메이션 */}
                <path d="M 0,220 Q 80,240 180,200 T 320,230" stroke="#fef08a" strokeWidth="1.2" strokeDasharray="8,16" opacity="0.35">
                  <animate attributeName="stroke-dashoffset" values="240;0" dur="4s" repeatCount="indefinite" />
                </path>
              </svg>
            </div>

            {/* Right Side: 모래 마을 절벽 벽면과 원통형/호리병형 건물들 */}
            <div className="absolute right-0 bottom-0" style={{ height: "60vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMaxYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* 모래/황토/점토 재질 그라디언트 */}
                  <linearGradient id="sandBaseR" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#d97706" />
                    <stop offset="60%" stopColor="#b45309" />
                    <stop offset="100%" stopColor="#78350f" />
                  </linearGradient>
                  <linearGradient id="sandHighlightR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="sandDarkR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#78350f" />
                    <stop offset="100%" stopColor="#451a03" />
                  </linearGradient>
                  <linearGradient id="sandCliffR" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#78350f" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#451a03" stopOpacity="0.2" />
                  </linearGradient>
                </defs>

                {/* 계곡 사막 바위 절벽 배경 */}
                <path d="M 320,0 L 230,0 Q 240,150 210,300 Q 225,450 250,600 L 320,600 Z" fill="url(#sandCliffR)" />
                <path d="M 320,120 Q 245,200 255,350 Q 240,480 260,600" stroke="#78350f" strokeWidth="1.5" opacity="0.4" fill="none" />

                {/* 뒤쪽 원통형 고층 건물 (중앙) */}
                <path d="M 120,250 L 250,250 L 250,600 L 120,600 Z" fill="url(#sandBaseR)" stroke="#78350f" strokeWidth="2.5" />
                <ellipse cx="185" cy="250" rx="65" ry="16" fill="url(#sandHighlightR)" stroke="#78350f" strokeWidth="2.5" />
                <ellipse cx="185" cy="250" rx="50" ry="10" fill="url(#sandDarkR)" />

                {/* 고층 원통 건물 창문들 (슬릿 배치) */}
                {/* 1열 */}
                <rect x="142" y="285" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="168" y="285" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="194" y="285" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="220" y="285" width="14" height="7" fill="#451a03" rx="1.5" />
                {/* 2열 */}
                <rect x="142" y="340" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="168" y="340" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="194" y="340" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="220" y="340" width="14" height="7" fill="#451a03" rx="1.5" />
                {/* 3열 */}
                <rect x="142" y="395" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="168" y="395" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="194" y="395" width="14" height="7" fill="#451a03" rx="1.5" />
                <rect x="220" y="395" width="14" height="7" fill="#451a03" rx="1.5" />

                {/* 돌출형 테라스 */}
                <path d="M 120,315 L 160,315 C 160,325 120,325 120,315 Z" fill="url(#sandHighlightR)" stroke="#78350f" strokeWidth="1.5" />

                {/* 중간 전경: 모래 호리병 가옥 (가아라의 모래 호리병 오마주) - 바닥(y=600)에 부착 */}
                <path d="M 85,420 C 70,430 65,475 80,490 C 70,500 65,540 85,600 L 135,600 C 155,540 150,500 140,490 C 150,475 145,430 135,420 Z" fill="url(#sandBaseR)" stroke="#78350f" strokeWidth="2.2" />
                <ellipse cx="110" cy="420" rx="25" ry="10" fill="url(#sandHighlightR)" stroke="#78350f" strokeWidth="2" />
                
                {/* 호리병 장식 띠 및 창문 */}
                <path d="M 75,487 Q 110,495 145,487" stroke="#78350f" strokeWidth="3" fill="none" />
                <rect x="95" y="445" width="12" height="18" fill="#451a03" rx="6" />
                <rect x="113" y="445" width="12" height="18" fill="#451a03" rx="6" />
                <rect x="100" y="515" width="20" height="85" fill="#451a03" rx="3" />

                {/* 우측 맨 앞: 요새형 단층 성벽 건물 */}
                <path d="M 215,450 L 300,450 L 300,600 L 215,600 Z" fill="url(#sandBaseR)" stroke="#78350f" strokeWidth="2.5" />
                <ellipse cx="257" cy="450" rx="42" ry="12" fill="url(#sandHighlightR)" stroke="#78350f" strokeWidth="2" />
                
                {/* 성벽 창문 */}
                <rect x="235" y="485" width="12" height="7" fill="#451a03" rx="1" />
                <rect x="260" y="485" width="12" height="7" fill="#451a03" rx="1" />
                <rect x="235" y="525" width="12" height="7" fill="#451a03" rx="1" />
                <rect x="260" y="525" width="12" height="7" fill="#451a03" rx="1" />

                {/* 모래바람 입자 휘날리는 애니메이션 (Drifting sand particles) */}
                <circle cx="20" cy="250" r="2.2" fill="#fef08a" opacity="0.6">
                  <animate attributeName="cx" values="20;300" dur="4.2s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="250;210" dur="4.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.75;0" dur="4.2s" repeatCount="indefinite" />
                </circle>
                <circle cx="280" cy="380" r="1.8" fill="#f59e0b" opacity="0.6">
                  <animate attributeName="cx" values="280;40" dur="3.5s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="380;340" dur="3.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.8;0" dur="3.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="220" cy="480" r="2.8" fill="#ea580c" opacity="0.5">
                  <animate attributeName="cx" values="220;10" dur="4.8s" repeatCount="indefinite" />
                  <animate attributeName="cy" values="480;420" dur="4.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.7;0" dur="4.8s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
          </div>
        </>
      )}

      {/* 구름 마을 배경 (고산 봉우리, 라이카게 집무실 및 원형 전망 데크) */}
      {theme === "cloud" && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes cloudDrift {
              from { transform: translateX(0); }
              to { transform: translateX(150vw); }
            }
            .cloud-mist-particle {
              position: absolute;
              background: radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.3) 60%, transparent 100%);
              filter: blur(8px);
              border-radius: 50%;
              animation: cloudDrift linear infinite;
            }
          `}} />
          
          <div className="cloud-mist-layer pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
            {CLOUD_MISTS.map((c, i) => (
              <div key={i} className="cloud-mist-particle" style={{
                top: c.top,
                left: c.left,
                width: c.width,
                height: c.height,
                animationDuration: c.duration,
                animationDelay: c.delay,
                opacity: c.opacity,
              }} />
            ))}
          </div>

          <div className="cloud-bg-structures pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.32, color: "var(--accent)" }}>
            {/* Left Side: 사진 가운데의 사령탑(라이카게 집무실 관저)과 전망 데크 배치 */}
            <div className="absolute left-0 bottom-0" style={{ height: "65vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* 바위 고산지대 그라디언트 */}
                  <linearGradient id="mountainGradL" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  
                  {/* 금속성 쿨 그레이 플랫폼 */}
                  <linearGradient id="deckGradL" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>

                  {/* 안개/구름 그라디언트 */}
                  <linearGradient id="mistGradL" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>

                  {/* 라이카게 집무실 메탈릭 번개 로열 블루 */}
                  <linearGradient id="metallicBlueL" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="35%" stopColor="#60a5fa" />
                    <stop offset="70%" stopColor="#1d4ed8" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>

                  {/* 금색 강철 밴드 */}
                  <linearGradient id="metalGoldL" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                </defs>

                {/* 1. 배경 고산 봉우리들 */}
                <path d="M 0,120 L 60,200 L 40,350 L 0,450 Z" fill="url(#mountainGradL)" opacity="0.6" />
                <path d="M 40,80 L 130,220 L 90,420 L 0,480 Z" fill="url(#mountainGradL)" opacity="0.75" />

                {/* 2. 라이카게 집무실 사령탑 본체 (좌측에 돋보이게 배치) */}
                {/* 집무실 하단 지붕 지지 기둥 */}
                <path d="M 142,470 L 158,470 L 158,600 L 142,600 Z" fill="#1e293b" opacity="0.65" />
                <line x1="150" y1="470" x2="150" y2="600" stroke="#0f172a" strokeWidth="3" />

                {/* 집무실 본체 (원형 항아리/Vase 형태로 하단이 뾰족해지는 리얼한 쉐입) */}
                <path d="M 140,490 C 130,480 105,460 90,420 C 70,370 70,320 90,300 L 210,300 C 230,320 230,370 210,420 C 195,460 170,480 160,490 Z" fill="url(#metallicBlueL)" stroke="#1e293b" strokeWidth="2.5" />
                <path d="M 150,300 C 200,300 220,330 220,380 C 220,420 210,460 185,480 Z" fill="#0f172a" opacity="0.25" /> {/* 3D 음영 */}
                
                {/* 뾰족한 맨 밑 끝단 금색 원뿔 캡 */}
                <path d="M 142,470 L 150,490 L 158,470 Z" fill="url(#metalGoldL)" stroke="#1e293b" strokeWidth="1.5" />

                {/* 입체적인 가로 골드 메탈 밴드 (두께와 곡률을 주어 실감나게 표현) */}
                <path d="M 90,320 Q 150,332 210,320 L 208,328 Q 150,340 92,328 Z" fill="url(#metalGoldL)" stroke="#1e293b" strokeWidth="1" />
                <path d="M 72,380 Q 150,395 228,380 L 226,388 Q 150,403 74,388 Z" fill="url(#metalGoldL)" stroke="#1e293b" strokeWidth="1" />
                <path d="M 100,440 Q 150,450 200,440 L 198,446 Q 150,456 102,446 Z" fill="url(#metalGoldL)" stroke="#1e293b" strokeWidth="1" />
                
                {/* 세로 격자 판 구조선 (3D 구형을 휘감는 모양으로 굴곡을 주어 입체감 극대화) */}
                <line x1="150" y1="300" x2="150" y2="470" stroke="#1e293b" strokeWidth="1.5" opacity="0.35" />
                <path d="M 130,300 C 120,350 120,420 135,470" stroke="#1e293b" strokeWidth="1.5" fill="none" opacity="0.35" />
                <path d="M 110,300 C 90,350 95,420 120,470" stroke="#1e293b" strokeWidth="1.5" fill="none" opacity="0.35" />
                <path d="M 170,300 C 180,350 180,420 165,470" stroke="#1e293b" strokeWidth="1.5" fill="none" opacity="0.35" />
                <path d="M 190,300 C 210,350 205,420 180,470" stroke="#1e293b" strokeWidth="1.5" fill="none" opacity="0.35" />

                {/* 관저 지붕 위의 평평한 정원 테라스 (울창한 초록 숲) */}
                <ellipse cx="150" cy="300" rx="60" ry="12" fill="#14532d" stroke="#1e293b" strokeWidth="2" />
                {/* 나무 숲의 실루엣들 */}
                <path d="M 90,300 C 85,285 105,280 110,290 C 115,280 130,280 135,292 C 140,280 155,275 160,290 C 165,280 185,280 190,292 C 195,280 215,285 210,300 Z" fill="#166534" />
                <path d="M 95,298 C 100,290 110,290 115,296 C 125,288 135,288 140,297 Q 150,290 160,298 Q 170,290 180,297 Z" fill="#22c55e" opacity="0.6" />

                {/* 관저 지붕 숲 한가운데 솟은 거대 바위 봉우리 */}
                <path d="M 120,295 C 125,240 140,170 150,170 C 160,170 175,240 180,295 Z" fill="url(#mountainGradL)" stroke="#1e293b" strokeWidth="1.5" />
                {/* 바위산 균열 질감 */}
                <path d="M 150,170 Q 140,230 145,295 M 150,170 Q 160,230 155,295" stroke="#0f172a" strokeWidth="1.5" fill="none" opacity="0.35" />

                {/* 봉우리 꼭대기의 금빛 전망 탑/스파이어 (기둥 기단 구조와 돔 캡 형태) */}
                <ellipse cx="150" cy="170" rx="14" ry="4" fill="url(#metalGoldL)" stroke="#1e293b" strokeWidth="1.5" />
                {/* 탑 지탱 세로 기둥들 */}
                <line x1="140" y1="170" x2="142" y2="135" stroke="#1e293b" strokeWidth="2.5" />
                <line x1="140" y1="170" x2="142" y2="135" stroke="url(#metalGoldL)" strokeWidth="1" />
                <line x1="150" y1="170" x2="150" y2="132" stroke="#1e293b" strokeWidth="2.5" />
                <line x1="150" y1="170" x2="150" y2="132" stroke="url(#metalGoldL)" strokeWidth="1" />
                <line x1="160" y1="170" x2="158" y2="135" stroke="#1e293b" strokeWidth="2.5" />
                <line x1="160" y1="170" x2="158" y2="135" stroke="url(#metalGoldL)" strokeWidth="1" />
                {/* 탑 꼭대기 돔 캡 */}
                <path d="M 138,135 C 138,120 162,120 162,135 Z" fill="url(#metalGoldL)" stroke="#1e293b" strokeWidth="2" />
                {/* 돔 탑 꼭대기 침선 안테나 */}
                <line x1="150" y1="125" x2="150" y2="90" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" />
                <line x1="150" y1="125" x2="150" y2="90" stroke="url(#metalGoldL)" strokeWidth="1.5" />

                {/* 사령탑 밑단을 지탱해 주는 전경의 갈라진 바위 협곡 봉우리들 (바위 틈새 안착 연출) */}
                <path d="M 70,600 L 110,480 L 142,500 L 150,600 Z" fill="url(#mountainGradL)" stroke="#1e293b" strokeWidth="1.5" />
                <path d="M 150,600 L 158,500 L 190,470 L 240,600 Z" fill="url(#mountainGradL)" stroke="#1e293b" strokeWidth="1.5" />

                {/* 사령탑 중단을 감싸고 흐르는 구름 mist */}
                <ellipse cx="150" cy="380" rx="80" ry="15" fill="url(#mistGradL)" opacity="0.75" />
                <ellipse cx="90" cy="365" rx="35" ry="9" fill="url(#mistGradL)" opacity="0.6" />
                <ellipse cx="205" cy="390" rx="45" ry="11" fill="url(#mistGradL)" opacity="0.6" />

                {/* 3. 맨 앞 전경: 튀어나온 원형 전망대 데크 플랫폼 */}
                {/* 플랫폼 바디 */}
                <path d="M -10,400 L 130,400 C 130,440 110,490 -10,520 Z" fill="url(#deckGradL)" stroke="#1e293b" strokeWidth="3" />
                {/* 리벳 및 기둥 */}
                <path d="M -10,415 C 40,415 100,430 115,415" stroke="#0f172a" strokeWidth="2.5" />
                <line x1="20" y1="415" x2="20" y2="600" stroke="#1e293b" strokeWidth="4" />
                <line x1="70" y1="420" x2="70" y2="600" stroke="#1e293b" strokeWidth="4" />
                {/* 난간 */}
                <path d="M -10,370 L 130,370" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
                <path d="M -10,385 L 130,385" stroke="#475569" strokeWidth="1.5" />
                <line x1="10" y1="370" x2="10" y2="400" stroke="#1e293b" strokeWidth="2" />
                <line x1="40" y1="370" x2="40" y2="400" stroke="#1e293b" strokeWidth="2" />
                <line x1="70" y1="370" x2="70" y2="400" stroke="#1e293b" strokeWidth="2" />
                <line x1="100" y1="370" x2="100" y2="400" stroke="#1e293b" strokeWidth="2" />

                {/* 4. 공중을 떠다니는 구름 레이어 애니메이션 */}
                <path d="M -20,260 Q 40,240 100,270 T 220,250 T 320,260 L 320,320 L -20,320 Z" fill="#ffffff" opacity="0.35">
                  <animate attributeName="d" 
                    values="M -20,260 Q 40,240 100,270 T 220,250 T 320,260 L 320,320 L -20,320 Z;
                            M -20,250 Q 50,270 110,250 T 230,270 T 320,250 L 320,320 L -20,320 Z;
                            M -20,260 Q 40,240 100,270 T 220,250 T 320,260 L 320,320 L -20,320 Z" 
                    dur="10s" repeatCount="indefinite" />
                </path>
              </svg>
            </div>

            {/* Right Side: 사진의 나머지 2~3개 작은 조형물들을 산과 바위 위에 밀착 배치 */}
            <div className="absolute right-0 bottom-0" style={{ height: "65vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMaxYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* 바위 고산지대 그라디언트 */}
                  <linearGradient id="mountainGradR" x1="1" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#475569" />
                    <stop offset="100%" stopColor="#1e293b" />
                  </linearGradient>
                  
                  {/* 금속성 쿨 그레이 플랫폼 */}
                  <linearGradient id="deckGradR" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>

                  {/* 안개/구름 그라디언트 */}
                  <linearGradient id="mistGradR" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.88" />
                    <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* 1. 우뚝 솟은 뾰족한 고산 바위 봉우리 3개 배치 */}
                {/* 바위산 Peak 1 (좌측 뒤) */}
                <path d="M 80,300 L 140,160 L 200,300 L 210,600 L 70,600 Z" fill="url(#mountainGradR)" stroke="#334155" strokeWidth="1.5" />
                
                {/* 바위산 Peak 2 (우측 뒤) */}
                <path d="M 180,340 L 240,200 L 300,340 L 320,600 L 140,600 Z" fill="url(#mountainGradR)" stroke="#334155" strokeWidth="1.5" />
                
                {/* 바위산 Peak 3 (우측 앞) */}
                <path d="M 140,420 L 200,280 L 260,420 L 280,600 L 100,600 Z" fill="url(#mountainGradR)" stroke="#2d3748" strokeWidth="1.8" />

                {/* 2. 산 위에 아기자기하게 얹어진 작은 건물 조형물들 3개 */}
                {/* 조형물 1: Peak 1 꼭대기에 올라앉은 잔(Chalice) 모양 건물 */}
                <path d="M 125,160 L 155,160 L 160,175 Q 165,190 155,200 L 125,200 Q 115,190 120,175 Z" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
                <ellipse cx="140" cy="160" rx="15" ry="4" fill="#64748b" stroke="#1e293b" />
                <rect x="132" y="172" width="5" height="12" fill="#0f172a" />
                <rect x="143" y="172" width="5" height="12" fill="#0f172a" />

                {/* 조형물 2: Peak 2 꼭대기에 올라앉은 원통형 가옥 */}
                <path d="M 225,200 L 255,200 L 255,230 L 225,230 Z" fill="#64748b" stroke="#1e293b" strokeWidth="1.5" />
                <path d="M 225,200 C 225,185 255,185 255,200 Z" fill="#fbbf24" stroke="#1e293b" strokeWidth="1.5" />
                <rect x="235" y="210" width="10" height="10" fill="#0f172a" rx="1" />

                {/* 조형물 3: Peak 3 꼭대기에 배치된 돔 지붕 타워 건물 */}
                <path d="M 185,280 L 215,280 L 215,315 L 185,315 Z" fill="#475569" stroke="#1e293b" strokeWidth="1.5" />
                <ellipse cx="200" cy="280" rx="15" ry="5" fill="#94a3b8" stroke="#1e293b" />
                <path d="M 190,280 C 190,270 210,270 210,280 Z" fill="#3b82f6" stroke="#1e293b" />
                <circle cx="200" cy="300" r="4.5" fill="#0f172a" />

                {/* 3. 산 사이를 채우는 둥실 구름 안개층 */}
                <ellipse cx="150" cy="320" rx="80" ry="16" fill="url(#mistGradR)" opacity="0.8" />
                <ellipse cx="250" cy="360" rx="60" ry="12" fill="url(#mistGradR)" opacity="0.7" />

                {/* 4. 맨 앞 전경: 튀어나온 원형 전망대 데크 플랫폼 */}
                {/* 플랫폼 바디 */}
                <path d="M 330,400 L 170,400 C 170,440 190,490 330,520 Z" fill="url(#deckGradR)" stroke="#1e293b" strokeWidth="3" />
                {/* 리벳 및 기둥 */}
                <path d="M 330,415 C 280,415 220,430 185,415" stroke="#0f172a" strokeWidth="2.5" />
                <line x1="280" y1="415" x2="280" y2="600" stroke="#1e293b" strokeWidth="4" />
                <line x1="230" y1="420" x2="230" y2="600" stroke="#1e293b" strokeWidth="4" />
                {/* 난간 */}
                <path d="M 330,370 L 170,370" stroke="#64748b" strokeWidth="3" strokeLinecap="round" />
                <path d="M 330,385 L 170,385" stroke="#475569" strokeWidth="1.5" />
                <line x1="300" y1="370" x2="300" y2="400" stroke="#1e293b" strokeWidth="2" />
                <line x1="270" y1="370" x2="270" y2="400" stroke="#1e293b" strokeWidth="2" />
                <line x1="240" y1="370" x2="240" y2="400" stroke="#1e293b" strokeWidth="2" />
                <line x1="210" y1="370" x2="210" y2="400" stroke="#1e293b" strokeWidth="2" />
                <line x1="180" y1="370" x2="180" y2="400" stroke="#1e293b" strokeWidth="2" />

                {/* 5. 공중을 떠다니는 구름 레이어 애니메이션 */}
                <path d="M 340,290 Q 280,270 220,300 T 100,280 T -20,290 L -20,350 L 340,350 Z" fill="#ffffff" opacity="0.35">
                  <animate attributeName="d" 
                    values="M 340,290 Q 280,270 220,300 T 100,280 T -20,290 L -20,350 L 340,350 Z;
                            M 340,280 Q 290,300 230,280 T 110,300 T -20,280 L -20,350 L 340,350 Z;
                            M 340,290 Q 280,270 220,300 T 100,280 T -20,290 L -20,350 L 340,350 Z" 
                    dur="12s" repeatCount="indefinite" />
                </path>
              </svg>
            </div>
          </div>
        </>
      )}
      {/* 묘목산 선보 배경 (기름 폭포와 거대 두꺼비 석상 & 우측 황금 싹 식물) */}
      {theme === "myoboku" && (
        <>
          <div className="myoboku-bg pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.35, color: "var(--accent)" }}>
            {/* Left Side: 묘목산 선보 — 절벽 기름 폭포와 원형 돌통 속 나뭇잎 우산 두꺼비 석상 */}
            <div className="absolute left-0 bottom-0" style={{ height: "65vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* 현무암 재질 그라디언트 */}
                  <linearGradient id="basaltBase" x1="0.2" y1="0" x2="0.8" y2="1">
                    <stop offset="0%" stopColor="#374151" />
                    <stop offset="60%" stopColor="#1f2937" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  <linearGradient id="basaltBelly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4b5563" />
                    <stop offset="100%" stopColor="#1f2937" />
                  </linearGradient>
                  <linearGradient id="basaltHighlight" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6b7280" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#6b7280" stopOpacity="0" />
                  </linearGradient>
                  
                  {/* 절벽 흙/바위 그라디언트 (고대 황토/암석 톤) */}
                  <linearGradient id="cliffGradLeft" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b2314" />
                    <stop offset="45%" stopColor="#78350f" />
                    <stop offset="80%" stopColor="#a16207" />
                    <stop offset="100%" stopColor="#271102" />
                  </linearGradient>
                  <linearGradient id="cliffGradRight" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#3b2314" />
                    <stop offset="45%" stopColor="#78350f" />
                    <stop offset="80%" stopColor="#a16207" />
                    <stop offset="100%" stopColor="#271102" />
                  </linearGradient>
                  <linearGradient id="mossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#15803d" />
                    <stop offset="40%" stopColor="#166534" />
                    <stop offset="100%" stopColor="#064e3b" />
                  </linearGradient>

                  {/* 절벽-폭포 간 3D 그림자 그라디언트 */}
                  <linearGradient id="waterfallEdgeShadowLeft" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="waterfallEdgeShadowRight" x1="1" y1="0" x2="0" y2="0">
                    <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.65" />
                    <stop offset="100%" stopColor="#1e1b4b" stopOpacity="0" />
                  </linearGradient>

                  {/* 묘목산 기름 폭포 애니메이션 패턴 - 글자 느낌의 각진 거품을 지우고, 흐르는 기름 액체와 광택 무늬로 교체 */}
                  <pattern id="oilFlowPattern" width="100" height="160" patternTransform="rotate(0)" patternUnits="userSpaceOnUse">
                    {/* 기름 베이스 황금빛 배경 */}
                    <rect width="100" height="160" fill="#f59e0b" />
                    
                    {/* 흘러내리는 오렌지-황금빛 흐름선 */}
                    <path d="M 0,0 L 100,0 L 100,160 L 0,160 Z" fill="#d97706" opacity="0.15" />
                    
                    {/* 부드러운 유선형 액체 흐름선 (글자 형태 배제) */}
                    <path d="M 15,-20 Q 30,30 15,80 Q 0,130 15,180 L 25,180 Q 10,130 25,80 Q 40,30 25,-20 Z" fill="#fef9c3" opacity="0.75" />
                    <path d="M 65,30 Q 80,80 65,130 Q 50,180 65,230 L 75,230 Q 60,180 75,130 Q 90,80 75,30 Z" fill="#fef9c3" opacity="0.65" />
                    <path d="M 45,70 Q 55,100 45,130 L 52,130 Q 62,100 52,70 Z" fill="#ffffff" opacity="0.5" />
                    
                    <animateTransform attributeName="patternTransform" type="translate" from="0,0" to="0,160" dur="1.6s" repeatCount="indefinite" />
                  </pattern>

                  {/* 반짝임(Glow) 효과 필터 */}
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* 계곡 뒷벽 그림자 */}
                <rect x="68" y="0" width="184" height="520" fill="#271102" />

                {/* 중앙 뒷배경: 거대 기름 폭포 */}
                <rect x="68" y="0" width="184" height="490" fill="url(#oilFlowPattern)" />
                
                {/* 폭포 가장자리 그림자 오버레이 (바위벽과의 3D 입체적 블렌딩) */}
                <rect x="68" y="0" width="20" height="490" fill="url(#waterfallEdgeShadowLeft)" />
                <rect x="232" y="0" width="20" height="490" fill="url(#waterfallEdgeShadowRight)" />

                {/* 폭포를 가로지르는 계단식 암반 단차선 (Ledging) */}
                <line x1="68" y1="130" x2="252" y2="130" stroke="#451a03" strokeWidth="4" opacity="0.45" />
                <line x1="68" y1="250" x2="252" y2="250" stroke="#451a03" strokeWidth="4" opacity="0.45" />
                <line x1="68" y1="370" x2="252" y2="370" stroke="#451a03" strokeWidth="4" opacity="0.45" />

                {/* 폭포 표면의 세로 광택선 (Glossy Highlights) */}
                <path d="M 90,0 Q 115,220 85,490" stroke="#ffffff" strokeWidth="3" opacity="0.38" filter="url(#glow)" />
                <path d="M 195,0 Q 170,250 205,490" stroke="#ffffff" strokeWidth="2.5" opacity="0.28" filter="url(#glow)" />
                <path d="M 142,0 L 142,490" stroke="#ffffff" strokeWidth="1.5" opacity="0.2" />

                {/* 폭포 위 반짝이는 광택 효과 별들 (Sparkles) */}
                <g filter="url(#glow)">
                  <g transform="translate(100, 150)">
                    <path d="M 0,-7 L 2,-2 L 7,0 L 2,2 L 0,7 L -2,2 L -7,0 L -2,-2 Z" fill="#ffffff">
                      <animate attributeName="opacity" values="0.2;1;0.2" dur="1.4s" repeatCount="indefinite" />
                    </path>
                  </g>
                  <g transform="translate(200, 220)">
                    <path d="M 0,-7 L 2,-2 L 7,0 L 2,2 L 0,7 L -2,2 L -7,0 L -2,-2 Z" fill="#ffffff">
                      <animate attributeName="opacity" values="1;0.3;1" dur="1.9s" repeatCount="indefinite" />
                    </path>
                  </g>
                  <g transform="translate(130, 310)">
                    <path d="M 0,-5 L 1.5,-1.5 L 5,0 L 1.5,1.5 L 0,5 L -1.5,1.5 L -5,0 L -1.5,-1.5 Z" fill="#ffffff">
                      <animate attributeName="opacity" values="0.1;0.9;0.1" dur="1.6s" repeatCount="indefinite" />
                    </path>
                  </g>
                  <g transform="translate(170, 90)">
                    <path d="M 0,-5 L 1.5,-1.5 L 5,0 L 1.5,1.5 L 0,5 L -1.5,1.5 L -5,0 L -1.5,-1.5 Z" fill="#ffffff">
                      <animate attributeName="opacity" values="0.9;0.2;0.9" dur="1.3s" repeatCount="indefinite" />
                    </path>
                  </g>
                  <g transform="translate(210, 360)">
                    <path d="M 0,-8 L 2.5,-2.5 L 8,0 L 2.5,2.5 L 0,8 L -2.5,2.5 L -8,0 L -2.5,-2.5 Z" fill="#ffffff">
                      <animate attributeName="opacity" values="0.2;1;0.2" dur="2.2s" repeatCount="indefinite" />
                    </path>
                  </g>
                  <g transform="translate(105, 410)">
                    <path d="M 0,-6 L 2,-2 L 6,0 L 2,2 L 0,6 L -2,2 L -6,0 L -2,-2 Z" fill="#ffffff">
                      <animate attributeName="opacity" values="1;0.3;1" dur="1.7s" repeatCount="indefinite" />
                    </path>
                  </g>
                </g>

                {/* Left Cliff - 디테일한 암반 굴곡과 명암을 더한 다단 레이어 */}
                {/* 왼쪽 절벽 베이스 */}
                <path d="M 0,0 L 78,0 C 72,90 64,180 70,270 C 75,350 71,430 54,510 L 0,530 Z" fill="url(#cliffGradLeft)" stroke="#1a0901" strokeWidth="1.5" />
                {/* 왼쪽 절벽 3D 안쪽 짙은 음영 */}
                <path d="M 0,80 Q 64,190 52,320 Q 56,420 42,510 L 0,510 Z" fill="#1c0a01" opacity="0.48" />
                {/* 왼쪽 절벽 돌출부 밝은 황토색 하이라이트 면 */}
                <path d="M 35,40 L 72,130 L 60,250 L 68,360 L 52,460 L 0,480 L 0,40 Z" fill="url(#basaltHighlight)" />
                {/* 왼쪽 절벽 균열(Crack) 선 */}
                <path d="M 68,160 Q 50,220 58,290 M 52,350 Q 35,400 42,470" stroke="#100500" strokeWidth="2.2" opacity="0.75" fill="none" />
                {/* 왼쪽 절벽 위 Moss/Grass (울창한 수풀) */}
                <path d="M 0,0 L 78,0 C 75,30 68,60 62,85 C 48,82 25,75 0,60 Z" fill="url(#mossGrad)" />
                {/* 절벽 아래로 아래로 매달려 처진 이끼/풀 디테일 */}
                <path d="M 0,58 Q 8,85 15,64 Q 25,92 32,68 Q 42,96 52,74 Q 58,85 62,85 L 62,0 L 0,0 Z" fill="#166534" />
                <path d="M 0,48 Q 12,78 20,54 Q 30,86 38,62" stroke="#15803d" strokeWidth="2.5" fill="none" opacity="0.8" />

                {/* Right Cliff - 디테일한 암반 굴곡과 명암을 더한 다단 레이어 */}
                {/* 오른쪽 절벽 베이스 */}
                <path d="M 320,0 L 242,0 C 248,90 256,180 250,270 C 245,350 249,430 266,510 L 320,530 Z" fill="url(#cliffGradRight)" stroke="#1a0901" strokeWidth="1.5" />
                {/* 오른쪽 절벽 3D 안쪽 짙은 음영 */}
                <path d="M 320,80 Q 256,190 268,320 Q 264,420 278,510 L 320,510 Z" fill="#1c0a01" opacity="0.48" />
                {/* 오른쪽 절벽 돌출부 밝은 황토색 하이라이트 면 */}
                <path d="M 285,40 L 248,130 L 260,250 L 252,360 L 268,460 L 320,480 L 320,40 Z" fill="url(#basaltHighlight)" />
                {/* 오른쪽 절벽 균열(Crack) 선 */}
                <path d="M 252,160 Q 270,220 262,290 M 268,350 Q 285,400 278,470" stroke="#100500" strokeWidth="2.2" opacity="0.75" fill="none" />
                {/* 오른쪽 절벽 위 Moss/Grass (울창한 수풀) */}
                <path d="M 320,0 L 242,0 C 245,30 252,60 258,85 C 272,82 295,75 320,60 Z" fill="url(#mossGrad)" />
                {/* 절벽 아래로 아래로 매달려 처진 이끼/풀 디테일 */}
                <path d="M 320,58 Q 312,85 305,64 Q 295,92 288,68 Q 278,96 268,74 Q 262,85 258,85 L 258,0 L 320,0 Z" fill="#166534" />
                <path d="M 320,48 Q 308,78 300,54 Q 290,86 282,62" stroke="#15803d" strokeWidth="2.5" fill="none" opacity="0.8" />

                {/* 앞 원형 돌통 (Pond Basin) - 뒷부분 림 및 액체 수면 */}
                <ellipse cx="160" cy="510" rx="100" ry="40" fill="url(#basaltBase)" stroke="#090d16" strokeWidth="3" />
                <ellipse cx="160" cy="506" rx="92" ry="34" fill="#f59e0b" />
                
                {/* 수면 위 동심원 잔물결 (Ripple lines) */}
                <ellipse cx="160" cy="506" rx="75" ry="27" fill="none" stroke="#ea580c" strokeWidth="1.5" opacity="0.6" />
                <ellipse cx="160" cy="506" rx="55" ry="20" fill="none" stroke="#ea580c" strokeWidth="1.5" opacity="0.6" />
                <ellipse cx="160" cy="506" rx="35" ry="12" fill="none" stroke="#ea580c" strokeWidth="1.5" opacity="0.7" />

                {/* 묘목산 두꺼비 석상 (원형 돌통 내부에 앉아 있음) */}
                {/* 두꺼비 몸통 */}
                <path d="M 120,445 C 105,455 102,485 115,505 L 205,505 C 218,485 215,455 200,445 Z" fill="url(#basaltBase)" stroke="#090d16" strokeWidth="2" />
                {/* 두꺼비 어깨 명암 */}
                <path d="M 120,445 C 115,465 118,495 130,505" stroke="#090d16" strokeWidth="1.5" opacity="0.4" fill="none" />
                <path d="M 200,445 C 205,465 202,495 190,505" stroke="#090d16" strokeWidth="1.5" opacity="0.4" fill="none" />

                {/* 두꺼비 머리 */}
                <path d="M 120,410 C 120,370 200,370 200,410 C 200,430 190,445 160,445 C 130,445 120,430 120,410 Z" fill="url(#basaltBase)" stroke="#090d16" strokeWidth="2.5" />
                {/* 머리 3D 그림자 */}
                <path d="M 160,372 C 185,372 200,390 200,410 C 200,430 190,445 160,445 Z" fill="#090d16" opacity="0.25" />
                
                {/* 두꺼비 눈 (돌 눈동자) */}
                <circle cx="138" cy="385" r="9" fill="url(#basaltBelly)" stroke="#090d16" strokeWidth="1.5" />
                <line x1="131" y1="385" x2="145" y2="385" stroke="#090d16" strokeWidth="2" />
                <circle cx="182" cy="385" r="9" fill="url(#basaltBelly)" stroke="#090d16" strokeWidth="1.5" />
                <line x1="175" y1="385" x2="189" y2="385" stroke="#090d16" strokeWidth="2" />

                {/* 두꺼비 콧구멍 */}
                <ellipse cx="148" cy="405" rx="2" ry="3" fill="#090d16" />
                <ellipse cx="172" cy="405" rx="2" ry="3" fill="#090d16" />

                {/* 두꺼비 입 */}
                <path d="M 135,420 Q 160,410 185,420 Q 160,445 135,420" fill="#090d16" stroke="#090d16" strokeWidth="2" />

                {/* 두꺼비 오른손과 지팡이/나뭇잎 우산 대 */}
                <circle cx="195" cy="445" r="7" fill="url(#basaltBelly)" stroke="#090d16" strokeWidth="1.5" />
                <path d="M 195,445 C 193,390 188,340 180,310" stroke="#090d16" strokeWidth="3" fill="none" />

                {/* 나뭇잎 우산 (Lotus/Rhubarb Leaf) */}
                <path d="M 180,310 C 150,290 100,300 95,320 C 95,335 130,340 180,315 C 220,335 245,330 245,315 C 245,300 200,290 180,310 Z" fill="url(#basaltBase)" stroke="#090d16" strokeWidth="2.5" />
                {/* 우산 잎맥 디테일 */}
                <path d="M 180,310 Q 140,315 105,318 M 180,310 Q 210,315 235,318 M 180,310 Q 160,300 130,298 M 180,310 Q 200,300 220,298" stroke="#090d16" strokeWidth="1.5" opacity="0.65" fill="none" />

                {/* 입에서 쏟아지는 작은 기름 줄기 */}
                <rect x="154" y="420" width="12" height="86" fill="#fbbf24" rx="2" />
                <rect x="157" y="420" width="6" height="86" fill="#fef08a" />
                <line x1="160" y1="420" x2="160" y2="506" stroke="#fef08a" strokeWidth="2" strokeDasharray="10,15" opacity="0.9">
                  <animate attributeName="stroke-dashoffset" values="50;0" dur="0.6s" repeatCount="indefinite" />
                </line>

                {/* 앞 원형 돌통 (Pond Basin) - 앞부분 림 (두꺼비를 감싸며 True 3D 레이어 구현) */}
                <path d="M 60,510 C 60,555 260,555 260,510 L 260,520 C 260,565 60,565 60,520 Z" fill="url(#basaltBase)" stroke="#090d16" strokeWidth="2.5" />
                {/* 림 상단 하이라이트 경선 */}
                <path d="M 60,510 C 60,555 260,555 260,510" stroke="#4b5563" strokeWidth="1.5" fill="none" />

                {/* 바닥 충돌 잔물결 물보라 */}
                <ellipse cx="160" cy="506" rx="16" ry="5" fill="#f59e0b" opacity="0.6" />
                <circle cx="152" cy="501" r="2.5" fill="#fbbf24" opacity="0.8">
                  <animate attributeName="cy" values="501;480" dur="0.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="0.8s" repeatCount="indefinite" />
                </circle>
                <circle cx="168" cy="503" r="2" fill="#fbbf24" opacity="0.8">
                  <animate attributeName="cy" values="503;485" dur="1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="1s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
            {/* Right Side: 묘목산 특유의 꽃 형태 식물 (황금 뿔 싹과 나선형 넝쿨) */}
            <div className="absolute right-0 bottom-0" style={{ height: "65vh", width: "320px" }}>
              <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* 황금 뿔 식물의 볼륨감을 위한 그라디언트 정의 */}
                  <linearGradient id="myobokuFlowerGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ea580c" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#fbbf24" stopOpacity="0.38" />
                    <stop offset="100%" stopColor="#fef08a" stopOpacity="0.25" />
                  </linearGradient>
                </defs>

                {/* 배경 절벽 실루엣 */}
                <path d="M 320,0 L 180,0 C 200,150 230,300 200,450 L 320,600 Z" fill="currentColor" opacity="0.08" />

                {/* [식물 본체] 나선형 층을 이루며 우상향으로 구부러진 거대 황금 싹 (죽순/뿔 형태) */}
                {/* 1단 - 가장 아래 넓은 부분 */}
                <path d="M 90,550 C 90,470 120,440 130,440 L 220,455 C 230,455 240,470 250,550 Z" fill="url(#myobokuFlowerGrad)" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.55" />
                {/* 2단 - 중간 하단 */}
                <path d="M 125,455 C 125,385 150,355 160,355 L 222,372 C 227,372 227,382 220,455 Z" fill="url(#myobokuFlowerGrad)" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.55" />
                {/* 3단 - 중간 상단 */}
                <path d="M 155,372 C 155,312 178,282 188,282 L 232,298 C 237,298 237,308 226,372 Z" fill="url(#myobokuFlowerGrad)" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.55" />
                {/* 4단 - 꼭대기 뾰족한 끝단 (오른쪽으로 살짝 휘어짐) */}
                <path d="M 185,298 C 185,248 225,215 260,225 C 235,245 228,265 230,298 Z" fill="url(#myobokuFlowerGrad)" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.55" />

                {/* 나선형 식물 질감 세로 곡선 디테일 */}
                <path d="M 130,550 Q 150,490 170,455" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" fill="none" />
                <path d="M 180,550 Q 190,490 195,455" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" fill="none" />
                <path d="M 160,455 Q 175,410 185,372" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" fill="none" />
                <path d="M 195,372 Q 205,330 215,298" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3" fill="none" />

                {/* [넝쿨 줄기] 식물 주변을 부드럽게 감싸고 꼬여서 말려 올라가는 고사리 모양의 넝쿨들 */}
                {/* 넝쿨 1: 좌측 큰 고사리 넝쿨 */}
                <path d="M 75,550 C 55,400 35,300 55,250 C 65,220 95,220 95,240 C 95,260 75,260 75,245 C 75,230 90,230 85,240" stroke="var(--accent)" strokeWidth="4.5" strokeLinecap="round" fill="none" opacity="0.65" />
                {/* 넝쿨 2: 가장 왼쪽 얇은 넝쿨 */}
                <path d="M 35,550 C 15,450 5,350 25,300 C 35,275 60,275 60,295 C 60,310 45,310 45,295 C 45,285 55,285 50,295" stroke="var(--accent-light)" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.55" />
                {/* 넝쿨 3: 우측 큰 넝쿨 */}
                <path d="M 260,550 C 280,450 300,350 280,300 C 270,275 245,275 245,295 C 245,310 260,310 260,295 C 260,285 250,285 255,295" stroke="var(--accent)" strokeWidth="4" strokeLinecap="round" fill="none" opacity="0.65" />
                {/* 넝쿨 4: 중앙 우상향 넝쿨 */}
                <path d="M 115,550 C 95,480 85,420 105,380 C 115,360 135,360 135,375 C 135,390 120,390 120,375 C 120,365 130,365 125,375" stroke="var(--accent-light)" strokeWidth="3.2" strokeLinecap="round" fill="none" opacity="0.5" />

                {/* [밑동 풀숲 및 뾰족한 잎사귀들] 식물의 기본 지탱력 표현 */}
                <path d="M 15,550 C 35,510 75,510 95,550 Z" fill="var(--accent)" opacity="0.45" />
                <path d="M 55,560 C 75,480 125,480 145,560 Z" fill="var(--accent-dark)" opacity="0.5" />
                <path d="M 115,550 C 145,490 195,490 225,550 Z" fill="var(--accent)" opacity="0.45" />
                <path d="M 175,560 C 205,470 265,470 295,560 Z" fill="var(--accent-dark)" opacity="0.5" />
                <path d="M 235,550 C 255,510 295,510 305,550 Z" fill="var(--accent)" opacity="0.45" />

                {/* 전경 잎사귀 칼날형 풀 디테일 */}
                <path d="M 75,550 L 105,475 L 135,550 Z" fill="var(--accent-light)" opacity="0.32" />
                <path d="M 205,550 L 235,465 L 265,550 Z" fill="var(--accent-light)" opacity="0.32" />
                <path d="M 135,550 L 165,495 L 195,550 Z" fill="var(--accent-light)" opacity="0.25" />
              </svg>
            </div>
          </div>

          {/* 묘목산 선보 화면 전체 선술 구체 레이어 */}
          <div className="myoboku-sparks-layer pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
            <style>{`
              @keyframes sparkFloat {
                0% { transform: translateY(110vh) translateX(0px); opacity: 0; }
                15% { opacity: 0.85; }
                85% { opacity: 0.85; }
                100% { transform: translateY(-10vh) translateX(40px); opacity: 0; }
              }
              .myoboku-spark {
                position: absolute;
                border-radius: 50%;
                animation: sparkFloat 7s ease-in-out infinite;
              }
            `}</style>
            {MYOBOKU_SPARKS.map((s, i) => (
              <div
                key={i}
                className="myoboku-spark"
                style={{
                  left: s.left,
                  width: `${s.size}px`,
                  height: `${s.size}px`,
                  background: s.color,
                  boxShadow: s.shadow,
                  animationDelay: s.delay,
                  animationDuration: s.duration,
                }}
              />
            ))}
          </div>
        </>
      )}      {/* 암살전술 특수부대 배경 (청록색과 회색 메인의 사령부/데스크) - 오른쪽에 긴 구조물 없음 */}
      {theme === "anbu" && (
        <>
          <div className="anbu-bg pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.42, color: "var(--accent)" }}>
            {/* Left Side: Anbu Equipment Desk & Mask Wall */}
            <div className="absolute left-0 bottom-0" style={{ height: "65vh", width: "clamp(115px, 20vw, 260px)" }}>
              <svg width="100%" height="100%" viewBox="0 0 260 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* 회색 철골 세로 벽/기둥 */}
                <rect x="0" y="80" width="35" height="520" fill="currentColor" opacity="0.16" />
                <line x1="35" y1="80" x2="35" y2="600" stroke="var(--border)" strokeWidth="2" opacity="0.4" />
                
                {/* 그릴 보관망 */}
                <rect x="50" y="170" width="160" height="230" stroke="currentColor" strokeWidth="2.2" opacity="0.7" strokeDasharray="3,3" />
                {/* 세로 철창 선 */}
                <line x1="90" y1="170" x2="90" y2="400" stroke="currentColor" strokeWidth="1.8" opacity="0.65" />
                <line x1="130" y1="170" x2="130" y2="400" stroke="currentColor" strokeWidth="1.8" opacity="0.65" />
                <line x1="170" y1="170" x2="170" y2="400" stroke="currentColor" strokeWidth="1.8" opacity="0.65" />
                {/* 가로 철창 선 추가 */}
                <line x1="50" y1="210" x2="210" y2="210" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
                <line x1="50" y1="260" x2="210" y2="260" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
                <line x1="50" y1="310" x2="210" y2="310" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
                <line x1="50" y1="360" x2="210" y2="360" stroke="currentColor" strokeWidth="1.5" opacity="0.55" />
                
                {/* 装備부 네온 전광판 (청록색 광선) */}
                <rect x="50" y="120" width="100" height="30" rx="5" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5" opacity="0.8" />
                <text x="65" y="140" fill="#22d3ee" fontSize="12" fontWeight="bold" letterSpacing="2" opacity="0.95">装備부</text>
                
                {/* 철제 배급 책상 */}
                <path d="M 0,440 L 220,440 L 200,600 L 0,600 Z" fill="currentColor" opacity="0.22" />
                <path d="M 0,440 L 220,440" stroke="#06b6d4" strokeWidth="3" opacity="0.75" />
                <line x1="0" y1="455" x2="215" y2="455" stroke="var(--border)" strokeWidth="1.5" opacity="0.45" />
                
                {/* 암부 카타나 칼 */}
                <path d="M 30,433 L 170,433" stroke="#e2e8f0" strokeWidth="2" opacity="0.85" />
                <path d="M 170,431 L 195,431" stroke="#0891b2" strokeWidth="3.5" opacity="0.75" />
                
                {/* 가면 장식 - 3/4 측면 암부 가면 */}
                <g transform="translate(115, 215) scale(1.2)">
                  {/* Left Ear */}
                  <path d="M -4,-8 L -16,-38 L 8,-8" fill="#ffffff" stroke="var(--border)" strokeWidth="2.5" strokeLinejoin="round" />
                  <path d="M -2,-8 L -10,-32 L 4,-8" fill="#4b5358" />

                  {/* Right Ear */}
                  <path d="M 18,-8 L 32,-40 L 38,-8" fill="#ffffff" stroke="var(--border)" strokeWidth="2.5" strokeLinejoin="round" />
                  <path d="M 22,-8 L 29,-34 L 34,-8" fill="#4b5358" />

                  {/* Face Shield */}
                  <path d="M 5,-10
                           C -5,0 -8,15 -8,25
                           C -8,30 -15,32 -22,42
                           C -26,47 -26,52 -22,56
                           C -15,62 -2,65 5,65
                           C 20,65 48,55 48,20
                           C 48,-5 30,-10 20,-10 Z"
                        fill="#ffffff" stroke="var(--border)" strokeWidth="2.5" strokeLinejoin="round" />

                  {/* Forehead Stripe */}
                  <path d="M 4,-10 C 8,-2 10,10 8,22 C 11,10 16,-2 20,-10 Z" fill="#4b5358" />

                  {/* Eyes */}
                  <ellipse cx="-2" cy="32" rx="4.5" ry="6.5" fill="#111827" />
                  <ellipse cx="22" cy="32" rx="6" ry="8.5" fill="#111827" />

                  {/* Nose Tip */}
                  <path d="M -23,45 C -25,47 -25,51 -23,53 L -20,49 Z" fill="#111827" />

                  {/* Nose Line Down */}
                  <path d="M -21,49 L -19,53" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />

                  {/* Mouth Line */}
                  <path d="M -23,53 L -14,53" stroke="#111827" strokeWidth="1.8" strokeLinecap="round" />
                </g>
                
                {/* 사령부 세로 청록 데이터선 */}
                <path d="M 12,80 L 12,600" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="10,35" opacity="0.45" />
              </svg>
            </div>

            {/* Right Side: Armory door (오른쪽에 장비부 문과 네온 글자 전광판 추가) - 밝기 밝게 조절 */}
            <div className="absolute right-0 bottom-0" style={{ height: "60vh", width: "clamp(80px, 14vw, 180px)" }}>
              <svg width="100%" height="100%" viewBox="0 0 180 550" preserveAspectRatio="xMaxYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* 청록 네온 텍스트 글로우 필터 */}
                  <filter id="anbuNeonGlow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>

                {/* 은은한 배경 안개 기운 */}
                <path d="M 180,150 Q 110,300 150,450 T 180,550 Z" fill="currentColor" opacity="0.08" />

                {/* 🚪 장비부 철제 문 (Steel Door) 그룹 */}
                <g transform="translate(15, 80)">
                  {/* 💡 문 위 装備부 네온 전광판 */}
                  <rect x="25" y="-40" width="100" height="28" rx="4" fill="#1e293b" stroke="#0891b2" strokeWidth="1.8" opacity="0.95" />
                  <rect x="25" y="-40" width="100" height="28" rx="4" fill="none" stroke="#22d3ee" strokeWidth="1.2" opacity="0.75" filter="url(#anbuNeonGlow)" />
                  <text x="43" y="-22" fill="#22d3ee" fontSize="12" fontWeight="bold" letterSpacing="3" opacity="0.95" filter="url(#anbuNeonGlow)">装備부</text>

                  {/* 외부 문틀 (Door Frame) - 밝은 색으로 변경 */}
                  <rect x="10" y="0" width="130" height="470" fill="#2e3f56" stroke="#475a72" strokeWidth="3.5" opacity="0.9" />

                  {/* 안쪽 철제 문 본체 (Steel Plate Door) - 밝은 색으로 변경 */}
                  <rect x="17" y="8" width="116" height="454" fill="#475a72" stroke="#647d9c" strokeWidth="2.5" />

                  {/* 3단 격자 패널 프레임 */}
                  {/* 상단 패널 */}
                  <rect x="25" y="20" width="100" height="125" fill="#223147" stroke="#647d9c" strokeWidth="1.8" />
                  {/* 중단 패널 */}
                  <rect x="25" y="165" width="100" height="125" fill="#223147" stroke="#647d9c" strokeWidth="1.8" />
                  {/* 하단 패널 */}
                  <rect x="25" y="310" width="100" height="125" fill="#223147" stroke="#647d9c" strokeWidth="1.8" />

                  {/* 🔩 리벳 못 디테일 (Rivet dots around frame) - 더 밝게 */}
                  {/* 왼쪽 프레임 라인 리벳 */}
                  <circle cx="13" cy="15" r="2" fill="#94a3b8" /><circle cx="13" cy="65" r="2" fill="#94a3b8" /><circle cx="13" cy="115" r="2" fill="#94a3b8" />
                  <circle cx="13" cy="165" r="2" fill="#94a3b8" /><circle cx="13" cy="215" r="2" fill="#94a3b8" /><circle cx="13" cy="265" r="2" fill="#94a3b8" />
                  <circle cx="13" cy="315" r="2" fill="#94a3b8" /><circle cx="13" cy="365" r="2" fill="#94a3b8" /><circle cx="13" cy="415" r="2" fill="#94a3b8" />
                  <circle cx="13" cy="455" r="2" fill="#94a3b8" />

                  {/* 오른쪽 프레임 라인 리벳 */}
                  <circle cx="137" cy="15" r="2" fill="#94a3b8" /><circle cx="137" cy="65" r="2" fill="#94a3b8" /><circle cx="137" cy="115" r="2" fill="#94a3b8" />
                  <circle cx="137" cy="165" r="2" fill="#94a3b8" /><circle cx="137" cy="215" r="2" fill="#94a3b8" /><circle cx="137" cy="265" r="2" fill="#94a3b8" />
                  <circle cx="137" cy="315" r="2" fill="#94a3b8" /><circle cx="137" cy="365" r="2" fill="#94a3b8" /><circle cx="137" cy="415" r="2" fill="#94a3b8" />
                  <circle cx="137" cy="455" r="2" fill="#94a3b8" />

                  {/* 가로 프레임 라인 리벳 */}
                  <circle cx="35" cy="5" r="2" fill="#94a3b8" /><circle cx="75" cy="5" r="2" fill="#94a3b8" /><circle cx="115" cy="5" r="2" fill="#94a3b8" />
                  <circle cx="35" cy="465" r="2" fill="#94a3b8" /><circle cx="75" cy="465" r="2" fill="#94a3b8" /><circle cx="115" cy="465" r="2" fill="#94a3b8" />

                  {/* 🎛️ 황동색 문 손잡이 노브 */}
                  <circle cx="32" cy="227" r="7" fill="#223147" stroke="#647d9c" strokeWidth="1.5" />
                  <circle cx="36" cy="227" r="4.2" fill="#eab308" stroke="#ca8a04" strokeWidth="1.2" />
                  <circle cx="36" cy="227" r="1.2" fill="#ffffff" />
                </g>
              </svg>
            </div>
            {/* 암부 화면 전체 그림자 안개 레이어 */}
            <div className="anbu-mist-layer pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
              <style>{`
                @keyframes anbuMist {
                  0%, 100% { opacity: 0.15; transform: scale(1) translateX(0); }
                  50% { opacity: 0.28; transform: scale(1.15) translateX(30px); }
                }
                .anbu-mist {
                  position: absolute;
                  width: 200%;
                  height: 200%;
                  background: radial-gradient(circle, rgba(15,23,42,0.6) 0%, transparent 60%);
                  animation: anbuMist 20s ease-in-out infinite;
                }
              `}</style>
              <div className="anbu-mist" style={{ top: '-50%', left: '-50%' }} />
            </div>
          </div>
        </>
      )}

      {/* 우치하 지하아지트 배경 */}
      {theme === "hideout" && (
        <div className="hideout-bg pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.35 }}>
          {/* 왼쪽: 우치하 석판 + 단상 */}
          <div className="absolute left-4 bottom-0" style={{ height: "60vh", width: "340px" }}>
            <svg width="100%" height="100%" viewBox="0 0 340 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="tabletGlow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="tabletBright">
                  <feComponentTransfer>
                    <feFuncR type="linear" slope="1.8" />
                    <feFuncG type="linear" slope="1.8" />
                    <feFuncB type="linear" slope="1.8" />
                  </feComponentTransfer>
                </filter>
              </defs>

              {/* 제단 바닥 단상 */}
              <path d="M 20,530 L 320,530 L 300,600 L 40,600 Z" fill="#1e293b" opacity="0.4" stroke="#475569" strokeWidth="2" />
              <line x1="20" y1="530" x2="320" y2="530" stroke="#ef4444" strokeWidth="1.5" opacity="0.3" />

              {/* 🪨 우치하 석판 본체 (밝기 필터 적용) */}
              <g transform="translate(30, 0)" filter="url(#tabletBright)">
                {/* 비석 그림자 */}
                <path d="M 50,510 C 90,505 190,505 230,510 L 220,540 C 180,542 100,542 60,540 Z" fill="#000" opacity="0.5" />
                {/* 비석 본체 */}
                <path d="M 60,250 C 75,235 110,230 140,232 C 170,230 205,235 220,250 L 230,510 C 220,515 200,518 140,518 C 80,518 60,515 50,510 Z" fill="#4b5563" stroke="#6b7280" strokeWidth="3" opacity="1" />
                {/* 석판 가로 질감 균열선 */}
                <path d="M 58,280 Q 90,285 110,278" stroke="#1f2937" strokeWidth="2" opacity="0.6" />
                <path d="M 170,410 Q 200,405 224,415" stroke="#1f2937" strokeWidth="2" opacity="0.6" />
                <path d="M 52,460 Q 90,458 130,465" stroke="#1f2937" strokeWidth="2" opacity="0.6" />
              </g>

              {/* 붉은 고대 문자 (밝기 필터 밖에서 독립 렌더, 진한 암적색) */}
              <g transform="translate(30, 0)" stroke="#7f0000" strokeWidth="2.5" strokeLinecap="round" opacity="0.95" filter="url(#tabletGlow)">
                <path d="M 80,290 V 470" strokeDasharray="3,12,6,8,2,14" />
                <path d="M 100,275 V 485" strokeDasharray="8,6,2,12,10,5" />
                <path d="M 120,265 V 490" strokeDasharray="4,8,12,5,3,15" />
                <path d="M 140,260 V 495" strokeDasharray="10,4,8,12,5,9" />
                <path d="M 160,260 V 495" strokeDasharray="2,14,5,10,12,6" />
                <path d="M 180,265 V 490" strokeDasharray="6,8,12,4,10,8" />
                <path d="M 200,275 V 485" strokeDasharray="12,5,3,14,8,6" />
              </g>
            </svg>
          </div>

          {/* 오른쪽: 우치하 심볼(상단) + 소형 화로 뭉글 불꽃 */}
          <div className="absolute right-4 bottom-0" style={{ height: "60vh", width: "320px" }}>
            <svg width="100%" height="100%" viewBox="0 0 320 600" preserveAspectRatio="xMaxYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient id="fireRadial" cx="50%" cy="58%" r="50%">
                  <stop offset="0%"   stopColor="#fefce8" />
                  <stop offset="25%"  stopColor="#fde047" />
                  <stop offset="60%"  stopColor="#f97316" />
                  <stop offset="100%" stopColor="#991b1b" stopOpacity="0.85" />
                </radialGradient>
                <radialGradient id="fireCoreRadial" cx="50%" cy="55%" r="45%">
                  <stop offset="0%"   stopColor="#ffffff" />
                  <stop offset="45%"  stopColor="#fef9c3" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.5" />
                </radialGradient>
                <filter id="uchihaGlow">
                  <feGaussianBlur stdDeviation="5" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
                <filter id="fireGlowFilter">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>

              <style>{`
                @keyframes uchihaFloat {
                  0%, 100% { transform: translateY(0px); }
                  50% { transform: translateY(-6px); }
                }
                @keyframes fireBreath {
                  0%, 100% { transform: scaleX(1) scaleY(1); filter: drop-shadow(0 0 14px rgba(251,146,60,0.9)); }
                  35%       { transform: scaleX(0.96) scaleY(1.05); filter: drop-shadow(0 0 24px rgba(251,146,60,1)); }
                  70%       { transform: scaleX(1.03) scaleY(0.97); filter: drop-shadow(0 0 18px rgba(251,146,60,0.95)); }
                }
                .uchiha-symbol { animation: uchihaFloat 3.5s ease-in-out infinite; }
                .fire-compact  { animation: fireBreath 1.8s ease-in-out infinite; transform-origin: 160px 485px; }
              `}</style>

              {/* 🔴 우치하 심볼 — 사진의 원작 형태와 완벽히 일치하는 고화질 문양 (상단 빨강, 하단 흰색 및 손잡이) */}
              <g className="uchiha-symbol" filter="url(#uchihaGlow)">
                {/* 손잡이 (뒤쪽 렌더링) */}
                <rect x="152" y="170" width="16" height="70" fill="#f8fafc" stroke="#1e293b" strokeWidth="4.5" rx="3" />
                {/* 메인 부채 원형 본체 */}
                <circle cx="160" cy="120" r="60" fill="#f8fafc" stroke="#1e293b" strokeWidth="4.5" />
                {/* 상단 붉은색 영역 */}
                <path d="M 100,120 A 60,60 0 0,1 220,120 Z" fill="#b91c1c" />
                {/* 빨강/하양 영역 분할선 */}
                <line x1="100" y1="120" x2="220" y2="120" stroke="#1e293b" strokeWidth="4.5" />
              </g>

              {/* 단상 바닥 */}
              <path d="M 20,530 L 300,530 L 280,600 L 40,600 Z" fill="#1e293b" opacity="0.4" stroke="#475569" strokeWidth="2" />
              <line x1="20" y1="530" x2="300" y2="530" stroke="#ef4444" strokeWidth="1.5" opacity="0.3" />

              {/* 🔥 뭉글하고 생동감 넘치는 리얼 불꽃 (3중 레이어 및 화티 플레어 효과) */}
              <g className="fire-compact" filter="url(#fireGlowFilter)">
                {/* 외부 주황/적색 불꽃 (적당히 얇상하고 날렵한 물방울 형태) */}
                <path d="M 160,325 C 125,370 120,410 120,485 C 140,492 180,492 200,485 C 200,410 195,370 160,325 Z" fill="url(#fireRadial)" />
                {/* 중간 진오렌지 불꽃 */}
                <path d="M 160,360 C 132,395 130,430 130,481 C 150,487 170,487 190,481 C 190,430 188,395 160,360 Z" fill="#ea580c" opacity="0.85" />
                {/* 내부 밝은 옐로우 코어 */}
                <path d="M 160,390 C 142,420 140,445 140,479 C 150,483 170,483 180,479 C 180,445 178,420 160,390 Z" fill="url(#fireCoreRadial)" opacity="0.95" />
                
                {/* 불꽃 위로 피어오르는 미세 스파크 입자들 (불꽃 높이에 맞춰 시작점 보정) */}
                <circle cx="160" cy="310" r="3" fill="#fef08a" opacity="0.8">
                  <animate attributeName="cy" values="310;250" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0" dur="2.5s" repeatCount="indefinite" />
                </circle>
                <circle cx="150" cy="300" r="2" fill="#f59e0b" opacity="0.6">
                  <animate attributeName="cy" values="300;230" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0" dur="3s" repeatCount="indefinite" />
                </circle>
                <circle cx="170" cy="320" r="2.5" fill="#fde047" opacity="0.7">
                  <animate attributeName="cy" values="320;255" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.7;0" dur="2.2s" repeatCount="indefinite" />
                </circle>
              </g>

              {/* 🪵 중후한 청동 화로 몸체 (지면 y=530에 단단히 밀착 안착) */}
              {/* 화로 입체 림 테두리 */}
              <rect x="110" y="475" width="100" height="8" fill="#2d2d2d" stroke="#0f172a" strokeWidth="2.5" rx="3" />
              {/* 화로 대접 그릇 바디 */}
              <path d="M 115,483 C 115,503 205,503 205,483 Z" fill="#374151" stroke="#0f172a" strokeWidth="2.5" />
              <path d="M 115,483 C 115,503 160,503 160,483 Z" fill="#1f2937" opacity="0.4" /> {/* 내부 하프 명암 */}
              <line x1="120" y1="483" x2="200" y2="483" stroke="#f59e0b" strokeWidth="1.5" opacity="0.4" /> {/* 금장 장식선 */}

              {/* 화로 청동 삼각 발굽 다리 (삼각 다리 구조물) */}
              {/* 좌측 발 */}
              <path d="M 122,488 C 112,510 115,528 120,530 C 125,530 125,525 122,520 C 118,510 125,498 132,488 Z" fill="#1f293b" stroke="#0f172a" strokeWidth="1.5" />
              {/* 중앙 발 */}
              <path d="M 160,492 C 155,515 156,530 160,533 C 164,530 165,515 160,492 Z" fill="#1f293b" stroke="#0f172a" strokeWidth="1.5" />
              {/* 우측 발 */}
              <path d="M 198,488 C 208,510 205,528 200,530 C 195,530 195,525 198,520 C 202,510 195,498 188,488 Z" fill="#1f293b" stroke="#0f172a" strokeWidth="1.5" />
            </svg>
          </div>
          {/* 우치하 지하아지트 화면 전체 까마귀 깃털 & 불씨 레이어 */}
          <div className="hideout-embers-layer pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
            <style>{`
              @keyframes crowFall {
                0% { transform: translateY(-10vh) translateX(0px) rotate(0deg); opacity: 0; }
                10% { opacity: 0.85; }
                90% { opacity: 0.85; }
                100% { transform: translateY(110vh) translateX(60px) rotate(270deg); opacity: 0; }
              }
              @keyframes emberRise {
                0% { transform: translateY(110vh) translateX(0) scale(1); opacity: 0; }
                20% { opacity: 0.95; }
                80% { opacity: 0.95; }
                100% { transform: translateY(-10vh) translateX(-40px) scale(0.6); opacity: 0; }
              }
              .crow-feather {
                position: absolute;
                animation: crowFall 8s linear infinite;
              }
              .hideout-ember {
                position: absolute;
                border-radius: 50%;
                background: radial-gradient(circle, #fdba74 20%, #ef4444 80%);
                box-shadow: 0 0 10px #f97316, 0 0 4px #ef4444;
                animation: emberRise 6s ease-in-out infinite;
              }
            `}</style>
            {/* 🐦 까마귀 깃털 입자 15개 */}
            {HIDEOUT_FEATHERS.map((f, i) => (
              <svg
                key={`feather-${i}`}
                className="crow-feather"
                width="24"
                height="36"
                viewBox="0 0 24 36"
                style={{
                  left: f.left,
                  animationDelay: f.delay,
                  animationDuration: f.duration,
                  transform: `scale(${f.scale})`,
                }}
              >
                <path
                  d="M12 0 C16 6, 19 18, 14 30 C12 33, 10 35, 8 36 C7 35, 6 30, 6 25 C5 15, 8 6, 12 0 Z"
                  fill="#0f172a"
                  stroke="#ef4444"
                  strokeWidth="0.8"
                  opacity="0.85"
                />
                <path d="M12 3 C12 15, 10 28, 8 35" stroke="#ef4444" strokeWidth="0.5" opacity="0.6" />
              </svg>
            ))}
            {/* 🔥 타오르는 붉은 불씨 20개 */}
            {HIDEOUT_EMBERS.map((e, i) => (
              <div
                key={`ember-${i}`}
                className="hideout-ember"
                style={{
                  left: e.left,
                  width: `${e.size}px`,
                  height: `${e.size}px`,
                  animationDelay: e.delay,
                  animationDuration: e.duration,
                }}
              />
            ))}
          </div>
        </div>
      )}      {theme === "orochimaru" && (
        <div className="orochi-bg pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden style={{ opacity: 0.65, color: "var(--accent)" }}>
          {/* 왼쪽: 뱀 모양 기계 장치 및 돌 받침대 */}
          <div className="absolute bottom-0" style={{ height: "60vh", width: "clamp(135px, 23vw, 300px)", left: "clamp(-55px, -4.2vw, -25px)" }}>
            <svg width="100%" height="100%" viewBox="0 0 300 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                {/* 뱀 본체용 어두운 청록색 그라디언트 */}
                <linearGradient id="snakeMetalGradLeft" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5eead4" />
                  <stop offset="35%" stopColor="#2dd4bf" />
                  <stop offset="70%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#134e4a" />
                </linearGradient>
                {/* 빔 광선 글로우 필터 */}
                <filter id="beamGlowLeft">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                {/* 개구리/뱀 눈빛 글로우 */}
                <filter id="eyeGlowLeft">
                  <feGaussianBlur stdDeviation="1.5" />
                </filter>
              </defs>

              {/* 🪨 돌 받침대 (Stone Pedestal) */}
              <ellipse cx="150" cy="535" rx="95" ry="22" fill="#000000" opacity="0.5" />
              <ellipse cx="150" cy="530" rx="90" ry="25" fill="#334155" stroke="#a855f7" strokeWidth="2.5" strokeOpacity="0.75" />
              <ellipse cx="150" cy="525" rx="85" ry="21" fill="#1e293b" />
              <ellipse cx="150" cy="525" rx="85" ry="21" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.45" />
              <path d="M 60,530 C 60,540 240,540 240,530" stroke="#0f172a" strokeWidth="2" fill="none" opacity="0.6" />

              {/* 🐍 뱀 모양 기계 본체 (Snake Coiled Machine) */}
              {/* 바닥 또아리 부분 (Coiled base) */}
              <ellipse cx="150" cy="505" rx="60" ry="20" fill="none" stroke="#0e293b" strokeWidth="24" />
              <ellipse cx="150" cy="505" rx="60" ry="20" fill="none" stroke="url(#snakeMetalGradLeft)" strokeWidth="22" />
              <ellipse cx="150" cy="505" rx="60" ry="20" fill="none" stroke="#0d9488" strokeWidth="22" strokeOpacity="0.35" />
              <ellipse cx="150" cy="505" rx="60" ry="20" fill="none" stroke="#99f6e4" strokeWidth="2" strokeOpacity="0.9" filter="url(#eyeGlowLeft)" />

              {/* 등줄기 아치 (Arching body loop) */}
              <path d="M 110,490 C 95,390 150,310 190,340" fill="none" stroke="#0e293b" strokeWidth="28" strokeLinecap="round" />
              <path d="M 110,490 C 95,390 150,310 190,340" fill="none" stroke="url(#snakeMetalGradLeft)" strokeWidth="26" strokeLinecap="round" />
              <path d="M 110,490 C 95,390 150,310 190,340" fill="none" stroke="#0d9488" strokeWidth="26" strokeLinecap="round" strokeOpacity="0.4" />
              <path d="M 110,490 C 95,390 150,310 190,340" fill="none" stroke="#99f6e4" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.95" filter="url(#eyeGlowLeft)" />

              {/* 뱀 머리 부분 (Snake Head) */}
              <path d="M 180,335 C 195,335 210,345 205,370 C 200,385 180,385 175,370 Z" fill="#0e293b" />
              <path d="M 180,335 C 195,335 210,345 205,370 C 200,385 180,385 175,370 Z" fill="url(#snakeMetalGradLeft)" />
              <path d="M 180,335 C 195,335 210,345 205,370 C 200,385 180,385 175,370 Z" fill="none" stroke="#99f6e4" strokeWidth="2.5" strokeOpacity="0.95" filter="url(#eyeGlowLeft)" />

              {/* 빨갛게 빛나는 뱀의 눈 (Sinister red eye) */}
              <circle cx="196" cy="358" r="2.5" fill="#ef4444" filter="url(#eyeGlowLeft)">
                <animate attributeName="opacity" values="0.6;1.0;0.6" dur="1.8s" repeatCount="indefinite" />
              </circle>

              {/* ⚡ 입에서 수직으로 뿜어 나오는 빛의 광선 (Vertical Glowing Light Column) */}
              <line x1="185" y1="368" x2="185" y2="495" stroke="#22d3ee" strokeWidth="24" opacity="0.18" strokeLinecap="round" filter="url(#beamGlowLeft)">
                <animate attributeName="opacity" values="0.12;0.26;0.12" dur="2.5s" repeatCount="indefinite" />
              </line>
              <line x1="185" y1="368" x2="185" y2="495" stroke="#22d3ee" strokeWidth="14" opacity="0.45" strokeLinecap="round" filter="url(#beamGlowLeft)">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
              </line>
              <line x1="185" y1="370" x2="185" y2="495" stroke="#ffffff" strokeWidth="8" opacity="0.95" strokeLinecap="round" />
            </svg>
          </div>

          {/* 오른쪽: 왼쪽과 완전히 동일한 뱀 모양 기계 장치를 좌우 반전하여 대칭 배치 */}
          <div className="absolute bottom-0" style={{ height: "60vh", width: "clamp(135px, 23vw, 300px)", right: "clamp(-55px, -4.2vw, -25px)" }}>
            <svg width="100%" height="100%" viewBox="0 0 300 600" preserveAspectRatio="xMinYMax meet" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: "scaleX(-1)" }}>
              <defs>
                <linearGradient id="snakeMetalGradRight" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#5eead4" />
                  <stop offset="35%" stopColor="#2dd4bf" />
                  <stop offset="70%" stopColor="#0f766e" />
                  <stop offset="100%" stopColor="#134e4a" />
                </linearGradient>
                <filter id="beamGlowRight">
                  <feGaussianBlur stdDeviation="5" />
                </filter>
                <filter id="eyeGlowRight">
                  <feGaussianBlur stdDeviation="1.5" />
                </filter>
              </defs>

              {/* 🪨 돌 받침대 (Stone Pedestal) */}
              <ellipse cx="150" cy="535" rx="95" ry="22" fill="#000000" opacity="0.5" />
              <ellipse cx="150" cy="530" rx="90" ry="25" fill="#334155" stroke="#a855f7" strokeWidth="2.5" strokeOpacity="0.75" />
              <ellipse cx="150" cy="525" rx="85" ry="21" fill="#1e293b" />
              <ellipse cx="150" cy="525" rx="85" ry="21" fill="none" stroke="#a855f7" strokeWidth="1.5" strokeOpacity="0.45" />
              <path d="M 60,530 C 60,540 240,540 240,530" stroke="#0f172a" strokeWidth="2" fill="none" opacity="0.6" />

              {/* 🐍 뱀 모양 기계 본체 (Snake Coiled Machine) */}
              <ellipse cx="150" cy="505" rx="60" ry="20" fill="none" stroke="#0e293b" strokeWidth="24" />
              <ellipse cx="150" cy="505" rx="60" ry="20" fill="none" stroke="url(#snakeMetalGradRight)" strokeWidth="22" />
              <ellipse cx="150" cy="505" rx="60" ry="20" fill="none" stroke="#0d9488" strokeWidth="22" strokeOpacity="0.35" />
              <ellipse cx="150" cy="505" rx="60" ry="20" fill="none" stroke="#99f6e4" strokeWidth="2" strokeOpacity="0.9" filter="url(#eyeGlowRight)" />

              {/* 등줄기 아치 (Arching body loop) */}
              <path d="M 110,490 C 95,390 150,310 190,340" fill="none" stroke="#0e293b" strokeWidth="28" strokeLinecap="round" />
              <path d="M 110,490 C 95,390 150,310 190,340" fill="none" stroke="url(#snakeMetalGradRight)" strokeWidth="26" strokeLinecap="round" />
              <path d="M 110,490 C 95,390 150,310 190,340" fill="none" stroke="#0d9488" strokeWidth="26" strokeLinecap="round" strokeOpacity="0.4" />
              <path d="M 110,490 C 95,390 150,310 190,340" fill="none" stroke="#99f6e4" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.95" filter="url(#eyeGlowRight)" />

              {/* 뱀 머리 부분 (Snake Head) */}
              <path d="M 180,335 C 195,335 210,345 205,370 C 200,385 180,385 175,370 Z" fill="#0e293b" />
              <path d="M 180,335 C 195,335 210,345 205,370 C 200,385 180,385 175,370 Z" fill="url(#snakeMetalGradRight)" />
              <path d="M 180,335 C 195,335 210,345 205,370 C 200,385 180,385 175,370 Z" fill="none" stroke="#99f6e4" strokeWidth="2.5" strokeOpacity="0.95" filter="url(#eyeGlowRight)" />

              {/* 빨갛게 빛나는 뱀의 눈 (Sinister red eye) */}
              <circle cx="196" cy="358" r="2.5" fill="#ef4444" filter="url(#eyeGlowRight)">
                <animate attributeName="opacity" values="0.6;1.0;0.6" dur="1.8s" repeatCount="indefinite" />
              </circle>

              {/* ⚡ 입에서 수직으로 뿜어 나오는 빛의 광선 (Vertical Glowing Light Column) */}
              <line x1="185" y1="368" x2="185" y2="495" stroke="#22d3ee" strokeWidth="24" opacity="0.18" strokeLinecap="round" filter="url(#beamGlowRight)">
                <animate attributeName="opacity" values="0.12;0.26;0.12" dur="2.5s" repeatCount="indefinite" />
              </line>
              <line x1="185" y1="368" x2="185" y2="495" stroke="#22d3ee" strokeWidth="14" opacity="0.45" strokeLinecap="round" filter="url(#beamGlowRight)">
                <animate attributeName="opacity" values="0.3;0.6;0.3" dur="2.5s" repeatCount="indefinite" />
              </line>
              <line x1="185" y1="370" x2="185" y2="495" stroke="#ffffff" strokeWidth="8" opacity="0.95" strokeLinecap="round" />
            </svg>
          </div>

          {/* 오로치마루 비밀실험실 화면 전체 보글보글 기포 레이어 */}
          <div className="orochi-bubbles-layer pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
            <style>{`
              @keyframes gasRise {
                0% { transform: translateY(110vh) translateX(0) scaleY(0.7) scaleX(0.8); opacity: 0; }
                12% { opacity: 0.65; }
                50% { transform: translateY(55vh) translateX(18px) scaleY(1.1) scaleX(1); }
                88% { opacity: 0.4; transform: translateY(12vh) translateX(-22px) scaleY(1.4) scaleX(1.3); }
                100% { transform: translateY(2vh) translateX(-30px) scaleY(1.6) scaleX(1.6); opacity: 0; }
              }
              @keyframes gasWobble {
                0%   { border-radius: 50% 50% 45% 55% / 60% 65% 35% 40%; }
                33%  { border-radius: 45% 55% 50% 50% / 65% 55% 45% 35%; }
                66%  { border-radius: 55% 45% 55% 45% / 55% 60% 40% 45%; }
                100% { border-radius: 50% 50% 45% 55% / 60% 65% 35% 40%; }
              }
              .orochi-bubble {
                position: absolute;
                bottom: 0;
                filter: blur(4px);
                mix-blend-mode: screen;
                animation: gasRise linear infinite, gasWobble ease-in-out infinite;
              }
            `}</style>
            {OROCHI_BUBBLES.map((b, i) => (
              <div
                key={i}
                className="orochi-bubble"
                style={{
                  left: b.left,
                  width: `${b.width}px`,
                  height: `${b.height}px`,
                  background: b.background,
                  boxShadow: b.boxShadow,
                  animationDelay: b.delay,
                  animationDuration: b.duration,
                }}
              />
            ))}
          </div>
        </div>
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
                  {selectableThemes.map((t, i) => (
                    <button
                      key={t.id}
                      onClick={() => { setTheme(t.id); setDropdownOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold text-left transition-all"
                      style={{
                        background: theme === t.id ? t.accentColor + "22" : "transparent",
                        color: theme === t.id ? t.accentColor : "var(--text-muted)",
                        borderBottom: i < selectableThemes.length - 1 ? "1px solid var(--border)" : "none",
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

      {/* 🎉 비술 테마 잠금 해제 축하 모달 */}
      {unlockModalData && (
        <div className="fixed inset-0 flex items-center justify-center z-[100] px-4" style={{ pointerEvents: "auto" }}>
          {/* 백드롭 */}
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity duration-300 cursor-pointer"
            onClick={() => setUnlockModalData(null)}
          />
          {/* 모달 본체 */}
          <div 
            className="relative max-w-md w-full rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.6)] border transition-all duration-300 transform scale-100 flex flex-col text-slate-100"
            style={{ 
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              borderColor: unlockModalData.color + "55",
              boxShadow: `0 0 35px ${unlockModalData.color}20, 0 16px 40px rgba(0,0,0,0.7)`
            }}
          >
            {/* 상단 컬러 띠 */}
            <div 
              className="h-1.5 w-full animate-pulse"
              style={{ background: unlockModalData.color }}
            />
            
            <div className="p-6 text-center flex-1 flex flex-col items-center">
              {/* 아이콘 뱃지 */}
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-4 relative shadow-[0_0_20px_rgba(0,0,0,0.4)]"
                style={{ 
                  background: unlockModalData.color + "22",
                  border: `2px solid ${unlockModalData.color}`
                }}
              >
                <span className="relative z-10 animate-bounce">{unlockModalData.icon}</span>
                <div 
                  className="absolute inset-0 rounded-full animate-ping opacity-20"
                  style={{ backgroundColor: unlockModalData.color }}
                />
              </div>
              
              <h2 className="text-lg font-black tracking-wider mb-1" style={{ color: "var(--accent-gold)" }}>
                ✨ 비술 테마 획득!
              </h2>
              <h3 
                className="text-xl font-bold mb-3"
                style={{ color: unlockModalData.color }}
              >
                {unlockModalData.name}
              </h3>
              
              <p className="text-xs font-semibold text-slate-300 bg-slate-900/80 border border-slate-700/50 px-3 py-1.5 rounded-lg mb-4 w-full">
                {unlockModalData.desc}
              </p>
              
              <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap text-left bg-black/30 p-4 rounded-xl border border-slate-800/80 w-full flex-1">
                {unlockModalData.flavor}
              </p>
            </div>
            
            {/* 액션 버튼 */}
            <div className="bg-slate-900/95 border-t border-slate-800/60 p-4 flex gap-3">
              <button
                onClick={() => setUnlockModalData(null)}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-150 border border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                닫기
              </button>
              <button
                onClick={() => {
                  setTheme(unlockModalData.id);
                  localStorage.setItem("theme", unlockModalData.id);
                  window.dispatchEvent(new CustomEvent("themechange", { detail: unlockModalData.id }));
                  setUnlockModalData(null);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all duration-150 text-white shadow-lg shadow-black/30 hover:scale-[1.02] hover:brightness-110 active:scale-95"
                style={{ 
                  background: `linear-gradient(135deg, ${unlockModalData.color}dd 0%, ${unlockModalData.color} 100%)`
                }}
              >
                즉시 적용하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
