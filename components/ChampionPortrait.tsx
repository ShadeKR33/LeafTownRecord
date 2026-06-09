"use client";

import { useState, useEffect } from "react";
import { getPortraitUrl } from "@/lib/championPortrait";

interface Props {
  name: string;
  size?: number;
  style?: React.CSSProperties;
}

export function ChampionPortrait({ name, size = 32, style }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPortraitUrl(name).then(u => { if (!cancelled) setUrl(u); });
    return () => { cancelled = true; };
  }, [name]);

  const radius = size <= 24 ? 4 : 8;
  const borderW = size <= 24 ? 1.5 : 2;

  const wrapStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    flexShrink: 0,
    position: "relative",
    display: "inline-block",
    // 금색 그라디언트 테두리
    background: "linear-gradient(135deg, #c8a951, #7a5c1e, #c8a951)",
    padding: borderW,
    boxShadow: `0 0 ${size <= 24 ? 4 : 8}px rgba(200,169,81,0.4)`,
    ...style,
  };

  const imgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    borderRadius: radius - 1,
    objectFit: "cover",
    display: "block",
    // 48px 원본을 선명하게 렌더링
    imageRendering: "-webkit-optimize-contrast" as React.CSSProperties["imageRendering"],
    filter: "brightness(1.18) contrast(1.08) saturate(1.08)",
  };

  if (!url) {
    return (
      <div style={{ ...wrapStyle, background: "var(--hover)" }}>
        <div style={{ ...imgStyle, background: "var(--panel)" }} />
      </div>
    );
  }

  return (
    <div style={wrapStyle}>
      <img src={url} alt={name} style={imgStyle} onError={() => setUrl(null)} />
    </div>
  );
}
