"use client";

import { useState, useEffect, useRef } from "react";
import { loadNicknames } from "@/lib/stats";
import type { NicknameEntry } from "@/lib/types";
import GuideBanner from "@/components/GuideBanner";

type MainMode = "home" | "team" | "minigame";
type TeamStep = "select" | "assign" | "game" | "result";
type MiniGameType = "shuriken" | "coin" | "scroll" | "pinball";
type Side = "blue" | "red" | null;

const BALL_COLORS = [
  "#06b6d4","#3b82f6","#8b5cf6","#a855f7",
  "#ec4899","#ef4444","#f97316","#eab308","#22c55e","#14b8a6",
];

function lightenHex(hex: string, t: number): string {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgb(${Math.round(r+(255-r)*t)},${Math.round(g+(255-g)*t)},${Math.round(b+(255-b)*t)})`;
}

// ─── Pinball board constants ──────────────────────────────────────────────────
const PB_W=340, PB_H=740, PB_BR=9;
interface PegDef{x:number;y:number;r:number;type:"normal"|"bumper";}
const PEGS:PegDef[]=(()=>{
  const ps:PegDef[]=[];
  const add=(x:number,y:number,r=6,type:"normal"|"bumper"="normal")=>ps.push({x,y,r,type});

  // Zone 1 – 깔때기 (funnel) y=60~120
  for(let i=0;i<5;i++){
    add(18+i*22, 62+i*14); // 왼쪽 대각
    add(322-i*22, 62+i*14); // 오른쪽 대각
  }
  // Zone 2 – 일반 핀 격자 y=145~290 (4행)
  for(let row=0;row<4;row++){
    const y=145+row*48, even=row%2===0, n=even?7:6;
    const sx=even?(PB_W-6*44)/2:(PB_W-5*44)/2+22;
    for(let c=0;c<n;c++) add(sx+c*44,y);
  }
  // Zone 3 – 대형 범퍼 y=320~420
  [[85,345],[170,325],[255,345],[128,392],[212,392]].forEach(([x,y])=>add(x,y,15,"bumper"));
  // 범퍼 주변 소형 핀
  [[50,360],[120,315],[220,315],[290,360],[155,425],[185,425]].forEach(([x,y])=>add(x,y,5));

  // Zone 4 – 지그재그 미끄럼틀 y=445~545
  // 왼쪽으로 흐르는 줄
  for(let i=0;i<6;i++) add(295-i*42, 450+i*16, 7);
  // 오른쪽으로 흐르는 줄
  for(let i=0;i<6;i++) add(45+i*42, 510+i*16, 7);

  // Zone 5 – 촘촘한 최종 구간 y=570~670 (5행)
  for(let row=0;row<5;row++){
    const y=570+row*36, even=row%2===0, n=even?9:8;
    const sx=even?(PB_W-8*34)/2:(PB_W-7*34)/2+17;
    for(let c=0;c<n;c++) add(sx+c*34,y,5);
  }
  return ps;
})();

interface PhysBall{x:number;y:number;vx:number;vy:number;color:string;label:string;playerLabel:string;finished:boolean;}

// ─── Pinball component ────────────────────────────────────────────────────────
function PinballGame({players,ballCount=1,onResult}:{
  players:{label:string;color:string}[];
  ballCount?:number;
  onResult?:(winner:string,side:Side)=>void;
}){
  const cvRef=useRef<HTMLCanvasElement>(null);
  const rafRef=useRef<number|null>(null);
  const finRef=useRef<string[]>([]);           // 완주한 playerLabel 순서 (중복 허용)
  const playerRankRef=useRef<string[]>([]);    // 플레이어 레벨 순위 (중복 없음)
  const bumperHitRef=useRef<Set<number>>(new Set());
  const [phase,setPhase]=useState<"idle"|"running"|"done">("idle");
  const [playerRanks,setPlayerRanks]=useState<string[]>([]);

  const FINISH_Y=PB_H-40;

  const getTheme=()=>{
    const s=getComputedStyle(document.documentElement);
    const v=(k:string)=>s.getPropertyValue(k).trim();
    return{bg:v("--bg"),panel:v("--panel"),accent:v("--accent"),
      accentLight:v("--accent-light"),accentGold:v("--accent-gold"),border:v("--border")};
  };

  const drawBg=(ctx:CanvasRenderingContext2D)=>{
    const t=getTheme();
    // 배경: 패널→배경 그라데이션
    const bgGrad=ctx.createLinearGradient(0,0,0,PB_H);
    bgGrad.addColorStop(0,t.panel); bgGrad.addColorStop(1,t.bg);
    ctx.fillStyle=bgGrad; ctx.fillRect(0,0,PB_W,PB_H);
    // 벽면 테두리
    ctx.strokeStyle=t.border; ctx.lineWidth=2;
    ctx.strokeRect(1,1,PB_W-2,PB_H-2);

    PEGS.forEach((p,idx)=>{
      const isBumper=p.type==="bumper";
      const isHit=bumperHitRef.current.has(idx);
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      if(isBumper){
        ctx.shadowBlur=isHit?24:8;
        ctx.shadowColor=isHit?t.accentGold:t.accentGold+"99";
        const g=ctx.createRadialGradient(p.x-4,p.y-4,1,p.x,p.y,p.r);
        g.addColorStop(0,isHit?lightenHex(t.accentGold,0.45):lightenHex(t.accentGold,0.22));
        g.addColorStop(1,isHit?t.accentGold:t.accent);
        ctx.fillStyle=g; ctx.fill(); ctx.shadowBlur=0;
        ctx.strokeStyle=isHit?t.accentGold:t.accentLight; ctx.lineWidth=2; ctx.stroke();
      } else {
        ctx.fillStyle=t.border; ctx.fill();
        ctx.strokeStyle=t.accentLight+"99"; ctx.lineWidth=1; ctx.stroke();
      }
    });

    // 구역 구분 라벨
    const zoneLabel=(text:string,y:number)=>{
      ctx.fillStyle=t.accent+"33"; ctx.font="9px sans-serif";
      ctx.textAlign="right"; ctx.textBaseline="middle";
      ctx.fillText(text,PB_W-4,y);
    };
    zoneLabel("ZONE 1",110); zoneLabel("ZONE 2",220);
    zoneLabel("BUMPER",380); zoneLabel("SLIDE",500); zoneLabel("ZONE 3",635);

    // FINISH 라인
    ctx.shadowBlur=6; ctx.shadowColor=t.accentGold;
    ctx.strokeStyle=t.accentGold; ctx.lineWidth=2.5; ctx.setLineDash([8,5]);
    ctx.beginPath(); ctx.moveTo(0,FINISH_Y); ctx.lineTo(PB_W,FINISH_Y); ctx.stroke();
    ctx.setLineDash([]); ctx.shadowBlur=0;
    ctx.fillStyle=t.accentGold+"cc"; ctx.font="bold 10px sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText("⚑ FINISH",PB_W/2,FINISH_Y+16);
  };

  const drawBall=(ctx:CanvasRenderingContext2D,b:PhysBall)=>{
    ctx.shadowBlur=12; ctx.shadowColor=b.color+"bb";
    ctx.beginPath(); ctx.arc(b.x,b.y,PB_BR,0,Math.PI*2);
    const g=ctx.createRadialGradient(b.x-3,b.y-3,1,b.x,b.y,PB_BR);
    g.addColorStop(0,lightenHex(b.color,0.42)); g.addColorStop(1,b.color);
    ctx.fillStyle=g; ctx.fill(); ctx.shadowBlur=0;
    ctx.strokeStyle="rgba(255,255,255,0.3)"; ctx.lineWidth=1.5; ctx.stroke();
    ctx.fillStyle="#fff"; ctx.font="bold 6.5px sans-serif";
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.fillText(b.label.length>3?b.label.slice(0,3):b.label,b.x,b.y);
  };

  const startRace=()=>{
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    finRef.current=[]; playerRankRef.current=[];
    bumperHitRef.current.clear();
    setPlayerRanks([]); setPhase("running");

    // 플레이어당 ballCount개 공 생성
    const balls:PhysBall[]=[];
    const totalSlots=players.length*(ballCount);
    const slotW=PB_W/(totalSlots+1);
    let slotIdx=0;
    players.forEach(p=>{
      for(let b=0;b<ballCount;b++){
        balls.push({
          x:slotW*(slotIdx+1)+(Math.random()-0.5)*6,
          y:20+(Math.random()*8),
          vx:(Math.random()-0.5)*1.8, vy:1.5+Math.random(),
          color:p.color, label:p.label, playerLabel:p.label, finished:false,
        });
        slotIdx++;
      }
    });

    const cv=cvRef.current!; const ctx=cv.getContext("2d")!;
    const loop=()=>{
      drawBg(ctx);
      let active=0; const newFin:string[]=[];

      balls.forEach(b=>{
        if(b.finished) return; active++;
        b.vy=Math.min(b.vy+0.25,10); b.x+=b.vx; b.y+=b.vy;
        if(b.x-PB_BR<1){b.x=PB_BR+1;b.vx=Math.abs(b.vx)*0.75;}
        if(b.x+PB_BR>PB_W-1){b.x=PB_W-PB_BR-1;b.vx=-Math.abs(b.vx)*0.75;}

        PEGS.forEach((p,idx)=>{
          const dx=b.x-p.x, dy=b.y-p.y, d=Math.hypot(dx,dy);
          const minD=PB_BR+p.r+0.5;
          if(d<minD&&d>0.01){
            const nx=dx/d, ny=dy/d;
            b.x=p.x+nx*(minD+1); b.y=p.y+ny*(minD+1);
            const dot=b.vx*nx+b.vy*ny;
            const bf=p.type==="bumper"?1.05:0.52;
            if(dot<0){b.vx-=2*dot*nx*bf; b.vy-=2*dot*ny*bf;}
            b.vx+=(Math.random()-0.5)*(p.type==="bumper"?2.2:1.4);
            if(b.vy<(p.type==="bumper"?0.5:1.8))b.vy=(p.type==="bumper"?0.5:1.8);
            if(p.type==="bumper"){
              bumperHitRef.current.add(idx);
              setTimeout(()=>bumperHitRef.current.delete(idx),200);
            }
          }
        });

        if(b.y+PB_BR>=FINISH_Y){
          b.finished=true; b.y=FINISH_Y-PB_BR; b.vx=0; b.vy=0;
          newFin.push(b.playerLabel);
          // 플레이어 첫 완주
          if(!playerRankRef.current.includes(b.playerLabel)){
            playerRankRef.current=[...playerRankRef.current,b.playerLabel];
            setPlayerRanks([...playerRankRef.current]);
          }
        }
      });

      balls.forEach(b=>drawBall(ctx,b));

      if(active===0||finRef.current.length+newFin.length>=balls.length){
        finRef.current=[...finRef.current,...newFin];
        setPhase("done");
        const winner=playerRankRef.current[0]||newFin.find(l=>!playerRankRef.current.includes(l))||"";
        if(winner&&onResult){
          const wi=players.findIndex(p=>p.label===winner);
          setTimeout(()=>onResult(winner,wi===0?"blue":"red"),800);
        }
        return;
      }
      finRef.current=[...finRef.current,...newFin];
      rafRef.current=requestAnimationFrame(loop);
    };
    rafRef.current=requestAnimationFrame(loop);
  };

  useEffect(()=>{
    const cv=cvRef.current; if(!cv) return;
    const ctx=cv.getContext("2d")!; drawBg(ctx);
    const sp=PB_W/(players.length+1);
    players.forEach((p,i)=>{
      const x=sp*(i+1);
      ctx.shadowBlur=8; ctx.shadowColor=p.color+"aa";
      ctx.beginPath(); ctx.arc(x,20,PB_BR,0,Math.PI*2);
      ctx.fillStyle=p.color; ctx.fill(); ctx.shadowBlur=0;
      ctx.fillStyle="#fff"; ctx.font="bold 6.5px sans-serif";
      ctx.textAlign="center"; ctx.textBaseline="middle";
      ctx.fillText(p.label.length>3?p.label.slice(0,3):p.label,x,20);
    });
    return ()=>{if(rafRef.current) cancelAnimationFrame(rafRef.current);};
  },[players]); // eslint-disable-line

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-wrap gap-2 justify-center">
        {players.map((p,i)=>(
          <div key={i} className="flex items-center gap-1.5 text-xs font-bold">
            <div style={{width:10,height:10,borderRadius:"50%",background:p.color,border:"1.5px solid rgba(255,255,255,0.25)"}}/>
            <span style={{color:"var(--text)"}}>{p.label}</span>
            {ballCount>1&&<span className="text-xs" style={{color:"var(--text-dim)"}}>×{ballCount}</span>}
          </div>
        ))}
      </div>
      <div style={{maxHeight:"70vh",overflowY:"auto",borderRadius:12}}>
        <canvas ref={cvRef} width={PB_W} height={PB_H}
          style={{borderRadius:12,border:"2px solid var(--border)",boxShadow:"0 8px 40px rgba(0,0,0,0.25)",display:"block"}}/>
      </div>
      {playerRanks.length>0&&(
        <div className="flex flex-wrap gap-2 justify-center">
          {playerRanks.map((name,i)=>{
            const p=players.find(pl=>pl.label===name);
            return(
              <div key={i} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-bold" style={{
                background:i===0?"rgba(251,191,36,0.15)":"var(--panel)",
                color:i===0?"#fbbf24":"var(--text-muted)",
                border:i===0?"1px solid #fbbf24":"1px solid var(--border)",
              }}>
                <div style={{width:8,height:8,borderRadius:"50%",background:p?.color||"#888"}}/>
                {i===0?"🏆":i===1?"🥈":i===2?"🥉":`${i+1}.`} {name}
              </div>
            );
          })}
        </div>
      )}
      <GameBtn onClick={startRace} disabled={phase==="running"}
        label={phase==="running"?"경주 중...":phase==="done"?"다시 하기":"🎮 핀볼 시작!"}/>
    </div>
  );
}

// ─── 표창 과녁 던지기 ─────────────────────────────────────────────────────────
function ShurikenGame({onResult}:{onResult:(s:Side)=>void}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const [throwing,setThrowing]=useState(false);
  const [result,setResult]=useState<Side>(null);
  const [scores,setScores]=useState<{t1:number;t2:number}|null>(null);
  const drawTarget=(ctx:CanvasRenderingContext2D,cx:number,cy:number,r:number)=>{
    [{r:r*1,color:"#fee2e2"},{r:r*0.8,color:"#fecaca"},{r:r*0.6,color:"#fca5a5"},{r:r*0.4,color:"#f87171"},{r:r*0.2,color:"#ef4444"}]
      .forEach(ring=>{ctx.beginPath();ctx.arc(cx,cy,ring.r,0,Math.PI*2);ctx.fillStyle=ring.color;ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=1.5;ctx.stroke();});
    ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fillStyle="#1e293b";ctx.fill();
  };
  const drawShuriken=(ctx:CanvasRenderingContext2D,x:number,y:number,rot:number,color:string)=>{
    ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.beginPath();
    for(let i=0;i<4;i++){const a=(i/4)*Math.PI*2,b=((i+0.5)/4)*Math.PI*2;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*14,Math.sin(a)*14);ctx.lineTo(Math.cos(b)*5,Math.sin(b)*5);}
    ctx.closePath();ctx.fillStyle=color;ctx.fill();ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fillStyle="#374151";ctx.fill();ctx.restore();
  };
  useEffect(()=>{const cv=canvasRef.current;if(!cv)return;const ctx=cv.getContext("2d")!;drawTarget(ctx,cv.width/2,cv.height/2,90);},[]);// eslint-disable-line
  const throwShuriken=()=>{
    if(throwing)return; setThrowing(true);setResult(null);setScores(null);
    const cv=canvasRef.current!,ctx=cv.getContext("2d")!,cx=cv.width/2,cy=cv.height/2;
    const t1r=Math.random()*75,t1a=Math.random()*Math.PI*2,t2r=Math.random()*75,t2a=Math.random()*Math.PI*2;
    const t1x=cx+Math.cos(t1a)*t1r,t1y=cy+Math.sin(t1a)*t1r,t2x=cx+Math.cos(t2a)*t2r,t2y=cy+Math.sin(t2a)*t2r;
    const s1=Math.max(0,Math.round(100-(t1r/90)*100)),s2=Math.max(0,Math.round(100-(t2r/90)*100));
    let frame=0;const total=40;
    const animate=()=>{
      ctx.clearRect(0,0,cv.width,cv.height);drawTarget(ctx,cx,cy,90);
      if(frame>10){const p=Math.min((frame-10)/(total-10),1);drawShuriken(ctx,cx+(t1x-cx)*p,cy+(t1y-cy)*p,p*Math.PI*4,"#3b82f6");}
      if(frame>20){const p=Math.min((frame-20)/(total-20),1);drawShuriken(ctx,cx+(t2x-cx)*p,cy+(t2y-cy)*p,p*Math.PI*4,"#ef4444");}
      frame++;if(frame<=total){requestAnimationFrame(animate);return;}
      drawShuriken(ctx,t1x,t1y,0,"#3b82f6");drawShuriken(ctx,t2x,t2y,0,"#ef4444");
      const side:Side=t1r<=t2r?"blue":"red";
      setScores({t1:s1,t2:s2});setResult(side);setThrowing(false);onResult(side);
    };requestAnimationFrame(animate);
  };
  return(
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 text-xs font-semibold"><span style={{color:"#3b82f6"}}>🔵 팀 1</span><span style={{color:"#ef4444"}}>🔴 팀 2</span></div>
      <canvas ref={canvasRef} width={220} height={220} style={{borderRadius:"50%",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",background:"#fef2f2"}}/>
      {scores&&<div className="flex gap-6 text-sm font-bold"><span style={{color:"#3b82f6"}}>팀 1: {scores.t1}점</span><span style={{color:"#ef4444"}}>팀 2: {scores.t2}점</span></div>}
      <GameBtn onClick={throwShuriken} disabled={throwing} label={throwing?"표창 날아가는 중...":"표창 던지기"}/>
      <ResultLabel result={result}/>
    </div>
  );
}

// ─── 동전 던지기 ──────────────────────────────────────────────────────────────
function CoinGame({onResult}:{onResult:(s:Side)=>void}){
  const [flipping,setFlipping]=useState(false);
  const [result,setResult]=useState<Side>(null);
  const coinRef=useRef<HTMLDivElement>(null);
  const flip=()=>{
    if(flipping)return;setFlipping(true);setResult(null);
    const isBlue=Math.random()<0.5;
    const totalFlips=(6+Math.floor(Math.random()*4))*180+(isBlue?0:180);
    if(coinRef.current){coinRef.current.style.transition="transform 1.8s cubic-bezier(0.23,1,0.32,1)";coinRef.current.style.transform=`rotateY(${totalFlips}deg)`;}
    setTimeout(()=>{const side:Side=isBlue?"blue":"red";setResult(side);setFlipping(false);onResult(side);},1900);
  };
  return(
    <div className="flex flex-col items-center gap-6">
      <div style={{perspective:"600px"}}>
        <div ref={coinRef} style={{width:150,height:150,borderRadius:"50%",position:"relative",transformStyle:"preserve-3d",transition:"transform 0s"}}>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",backfaceVisibility:"hidden",background:"radial-gradient(circle at 35% 35%,#93c5fd,#1d4ed8)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(29,78,216,0.4)",fontSize:"48px"}}>🔵</div>
          <div style={{position:"absolute",inset:0,borderRadius:"50%",backfaceVisibility:"hidden",transform:"rotateY(180deg)",background:"radial-gradient(circle at 35% 35%,#fca5a5,#b91c1c)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 20px rgba(185,28,28,0.4)",fontSize:"48px"}}>🔴</div>
        </div>
      </div>
      <GameBtn onClick={flip} disabled={flipping} label={flipping?"동전 날아가는 중...":"동전 던지기"}/>
      <ResultLabel result={result}/>
    </div>
  );
}

// ─── 두루마리 봉인 뽑기 ────────────────────────────────────────────────────────
function ScrollGame({onResult}:{onResult:(s:Side)=>void}){
  const [picked,setPicked]=useState<0|1|null>(null);
  const [result,setResult]=useState<Side>(null);
  const [sides,setSides]=useState<[Side,Side]>([null,null]);
  const pick=(idx:0|1)=>{
    if(picked!==null)return;
    const isBlue=Math.random()<0.5;
    const s:[Side,Side]=idx===0?[isBlue?"blue":"red",isBlue?"red":"blue"]:[isBlue?"red":"blue",isBlue?"blue":"red"];
    setSides(s);setPicked(idx);setResult(s[idx]!);onResult(s[idx]!);
  };
  const reset=()=>{setPicked(null);setResult(null);setSides([null,null]);};
  return(
    <div className="flex flex-col items-center gap-6">
      <p className="text-sm" style={{color:"var(--text-muted)"}}>두루마리 하나를 선택하세요</p>
      <div className="flex gap-8">
        {([0,1] as const).map(idx=>{
          const isOpen=picked!==null, s=sides[idx];
          return(
            <div key={idx} onClick={()=>pick(idx)} style={{cursor:isOpen?"default":"pointer"}}>
              <div style={{width:100,height:160,borderRadius:12,
                background:isOpen&&s?s==="blue"?"linear-gradient(180deg,#dbeafe,#1d4ed8)":"linear-gradient(180deg,#fee2e2,#b91c1c)":"linear-gradient(180deg,#f5f0e8,#d4c4a0)",
                border:isOpen&&s?s==="blue"?"2px solid #1d4ed8":"2px solid #b91c1c":"2px solid #a08060",
                boxShadow:picked===idx?"0 0 20px rgba(0,0,0,0.25)":"0 4px 12px rgba(0,0,0,0.1)",
                display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
                gap:8,transition:"all 0.4s",transform:picked===idx?"scale(1.08)":"scale(1)"}}>
                {isOpen&&s?(<><div style={{fontSize:42}}>{s==="blue"?"🔵":"🔴"}</div><div style={{fontSize:12,fontWeight:800,color:"#fff"}}>{s==="blue"?"블루":"레드"}</div></>)
                  :(<><div style={{fontSize:32}}>📜</div><div style={{fontSize:11,fontWeight:700,color:"#6b5a3e"}}>봉인 {idx+1}</div></>)}
              </div>
            </div>
          );
        })}
      </div>
      {result&&<ResetBtn onClick={reset} label="다시 뽑기"/>}
      <ResultLabel result={result}/>
    </div>
  );
}

// ─── 공통 컴포넌트 ─────────────────────────────────────────────────────────────
function GameBtn({onClick,disabled,label}:{onClick:()=>void;disabled:boolean;label:string}){
  return(<button onClick={onClick} disabled={disabled} className="px-6 py-2.5 rounded-full font-bold text-sm transition-all"
    style={{background:disabled?"var(--border)":"var(--accent)",color:"#fff",cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.7:1}}>{label}</button>);
}
function ResetBtn({onClick,label}:{onClick:()=>void;label:string}){
  return(<button onClick={onClick} className="px-6 py-2.5 rounded-full font-bold text-sm"
    style={{background:"var(--hover)",color:"var(--accent)",border:"1px solid var(--border-green)",cursor:"pointer"}}>{label}</button>);
}
function ResultLabel({result}:{result:Side}){
  if(!result) return null;
  return(<div className="text-center font-bold text-lg" style={{color:result==="blue"?"#2563eb":"#dc2626"}}>{result==="blue"?"🔵 블루 사이드!":"🔴 레드 사이드!"}</div>);
}

const MINI_GAMES:{id:MiniGameType;label:string}[]=[
  {id:"shuriken",label:"🎯 표창 던지기"},
  {id:"coin",    label:"🪙 동전 던지기"},
  {id:"scroll",  label:"📜 두루마리 뽑기"},
  {id:"pinball", label:"🎮 핀볼 레이스"},
];

// ─── 메인 페이지 ──────────────────────────────────────────────────────────────
export default function TeamPage(){
  const [mainMode,setMainMode]=useState<MainMode>("home");

  // ── Team mode state ──
  const [nicknames,setNicknames]=useState<NicknameEntry[]>([]);
  const [selected,setSelected]=useState<string[]>([]);
  const [team1,setTeam1]=useState<string[]>([]);
  const [team2,setTeam2]=useState<string[]>([]);
  const [teamStep,setTeamStep]=useState<TeamStep>("select");
  const [teamMiniGame,setTeamMiniGame]=useState<MiniGameType>("shuriken");
  const [sideResult,setSideResult]=useState<Side>(null);
  const [blueSide,setBlueSide]=useState<1|2|null>(null);
  const [copied,setCopied]=useState(false);
  const [announceFormat,setAnnounceFormat]=useState<"3판2선"|"5판3선">("3판2선");
  const [announceDate,setAnnounceDate]=useState(()=>new Date().toISOString().slice(0,10));
  const [announceTime,setAnnounceTime]=useState(()=>`${String(new Date().getHours()).padStart(2,"0")}:00`);
  const [positions,setPositions]=useState<Record<string,string>>({});

  // ── Minigame standalone state ──
  const [soGame,setSoGame]=useState<MiniGameType>("pinball");
  const [soSelected,setSoSelected]=useState<string[]>([]);
  const [soStep,setSoStep]=useState<"select"|"play">("select");
  const [soBallCount,setSoBallCount]=useState(1);

  const LANE_LIST=["탑","정글","미드","원딜","서폿"];
  const LANE_COLORS:Record<string,string>={탑:"#e06060",정글:"#50a050",미드:"#5090d0",원딜:"#c0a030",서폿:"#9060c0"};

  useEffect(()=>{loadNicknames().then(setNicknames);},[]);

  const displayName=(id:string)=>{const e=nicknames.find(n=>n.id===id);return e?.realName?.trim()||e?.nickname||id;};

  // ── Team helpers ──
  const toggleSelect=(id:string)=>setSelected(prev=>prev.includes(id)?prev.filter(x=>x!==id):prev.length<10?[...prev,id]:prev);
  const assignTo=(id:string,team:1|2)=>{
    setTeam1(prev=>prev.filter(x=>x!==id));setTeam2(prev=>prev.filter(x=>x!==id));
    if(team===1&&team1.length<5) setTeam1(prev=>[...prev,id]);
    else if(team===2&&team2.length<5) setTeam2(prev=>[...prev,id]);
  };
  const unassign=(id:string)=>{setTeam1(p=>p.filter(x=>x!==id));setTeam2(p=>p.filter(x=>x!==id));};
  const setPlayerPos=(id:string,pos:string,teamGroup:string[])=>{
    setPositions(prev=>{const next={...prev};teamGroup.forEach(pid=>{if(pid!==id&&next[pid]===pos)delete next[pid];});
      if(next[id]===pos)delete next[id];else next[id]=pos;return next;});
  };
  const unassigned=selected.filter(id=>!team1.includes(id)&&!team2.includes(id));
  const assignReady=team1.length>0&&team2.length>0&&unassigned.length===0;

  const handleGameResult=(side:Side)=>{
    setSideResult(side);setBlueSide(side==="blue"?1:2);
    setTimeout(()=>setTeamStep("result"),2800);
  };

  const formatDateLabel=()=>{
    const date=new Date(`${announceDate}T${announceTime}`);
    const days=["일","월","화","수","목","금","토"];
    const m=date.getMonth()+1,d=date.getDate(),dow=days[date.getDay()],h=date.getHours(),min=date.getMinutes();
    const ampm=h<12?"오전":"오후",displayH=h%12||12;
    return `${m}월 ${d}일 (${dow}) ${ampm} ${displayH}${min>0?":"+String(min).padStart(2,"0"):"시"}`;
  };

  const getAnnouncement=()=>{
    const blueTeam=blueSide===1?team1:team2,redTeam=blueSide===1?team2:team1;
    const orderTeam=(team:string[])=>{
      const ordered=LANE_LIST.map(pos=>team.find(id=>positions[id]===pos)).filter(Boolean) as string[];
      return[...ordered,...team.filter(id=>!positions[id])].map(displayName).join(" ");
    };
    return["🍃 나뭇잎 마을 내전 팀 편성 🍃",`${formatDateLabel()} | ${announceFormat}`,"",
      `🔵 블루: ${orderTeam(blueTeam)}`,`🔴 레드: ${orderTeam(redTeam)}`,""].join("\n");
  };

  const copyAnnouncement=()=>{
    navigator.clipboard.writeText(getAnnouncement()).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2000);});
  };

  const resetTeam=()=>{
    setSelected([]);setTeam1([]);setTeam2([]);setSideResult(null);setBlueSide(null);setCopied(false);setPositions({});setTeamStep("select");
  };

  const goHome=()=>{resetTeam();setSoSelected([]);setSoStep("select");setMainMode("home");};

  // Pinball players for team mode
  const teamPinballPlayers=[{label:"팀 1",color:"#3b82f6"},{label:"팀 2",color:"#ef4444"}];

  // Standalone pinball players
  const soPinballPlayers=soSelected.map((id,i)=>({label:displayName(id),color:BALL_COLORS[i%BALL_COLORS.length]}));

  // ── HOME ──────────────────────────────────────────────────────────────────
  if(mainMode==="home") return(
    <div className="max-w-3xl mx-auto px-4 py-8">
      <GuideBanner pageKey="team" icon="🎲" title="팀 편성 페이지 사용법" guideAnchor="team"
        items={["팀 정하기: 멤버를 선택하고 팀을 나눈 뒤 미니게임으로 블루/레드 진영을 결정해요.",
          "미니게임: 팀 구성 없이 바로 미니게임을 즐길 수 있어요.",
          "핀볼 레이스: 알록달록한 공이 핀볼 보드를 통해 경주합니다!"]}/>
      <h2 className="text-xl font-bold mb-8" style={{color:"var(--accent)"}}>🎲 팀 편성</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={()=>setMainMode("team")} className="rounded-2xl p-6 text-left transition-all hover:scale-[1.02]"
          style={{background:"var(--panel)",border:"2px solid var(--border)",boxShadow:"0 4px 16px rgba(0,0,0,0.08)",cursor:"pointer"}}>
          <div className="text-4xl mb-3">🎮</div>
          <div className="text-lg font-black mb-1" style={{color:"var(--text)"}}>팀 정하기</div>
          <div className="text-sm" style={{color:"var(--text-muted)"}}>플레이어를 선택하고 두 팀으로 나눈 뒤, 미니게임으로 블루/레드 진영을 결정해요.</div>
          <div className="mt-4 flex gap-2">
            {["선수 선택","팀 배정","진영 결정","최종 결과"].map((s,i)=>(
              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{background:"var(--hover)",color:"var(--text-dim)",border:"1px solid var(--border)"}}>{s}</span>
            ))}
          </div>
        </button>
        <button onClick={()=>setMainMode("minigame")} className="rounded-2xl p-6 text-left transition-all hover:scale-[1.02]"
          style={{background:"var(--panel)",border:"2px solid var(--border)",boxShadow:"0 4px 16px rgba(0,0,0,0.08)",cursor:"pointer"}}>
          <div className="text-4xl mb-3">🎲</div>
          <div className="text-lg font-black mb-1" style={{color:"var(--text)"}}>미니게임</div>
          <div className="text-sm" style={{color:"var(--text-muted)"}}>팀 구성 없이 바로 미니게임을 즐길 수 있어요. 핀볼 레이스로 순위를 정해보세요!</div>
          <div className="mt-4 flex gap-2 flex-wrap">
            {MINI_GAMES.map(g=>(
              <span key={g.id} className="text-xs px-2 py-0.5 rounded-full" style={{background:"var(--hover)",color:"var(--text-dim)",border:"1px solid var(--border)"}}>{g.label}</span>
            ))}
          </div>
        </button>
      </div>
    </div>
  );

  // ── MINIGAME STANDALONE ───────────────────────────────────────────────────
  if(mainMode==="minigame") return(
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={goHome} className="text-sm px-3 py-1.5 rounded-full font-semibold"
          style={{background:"var(--hover)",color:"var(--text-muted)",border:"1px solid var(--border)",cursor:"pointer"}}>← 홈</button>
        <h2 className="text-xl font-bold" style={{color:"var(--accent)"}}>🎲 미니게임</h2>
      </div>

      {/* 게임 탭 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {MINI_GAMES.map(g=>(
          <button key={g.id} onClick={()=>{setSoGame(g.id);setSoStep("select");}}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
            style={{background:soGame===g.id?"var(--accent)":"var(--hover)",color:soGame===g.id?"#fff":"var(--text-muted)",
              border:soGame===g.id?"none":"1px solid var(--border)",cursor:"pointer"}}>
            {g.label}
          </button>
        ))}
      </div>

      {/* 핀볼: 참여자 선택 → 게임 */}
      {soGame==="pinball"&&(
        <div>
          {soStep==="select"?(
            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm" style={{color:"var(--text-muted)"}}>핀볼에 참여할 플레이어를 선택하세요 (2~10명)</p>
                <span className="text-sm font-bold" style={{color:"var(--accent)"}}>{soSelected.length}명</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
                {nicknames.map(n=>{
                  const isSel=soSelected.includes(n.id);
                  const name=n.realName?.trim()||n.nickname;
                  return(
                    <button key={n.id} onClick={()=>setSoSelected(prev=>isSel?prev.filter(x=>x!==n.id):prev.length<10?[...prev,n.id]:prev)}
                      className="px-3 py-2.5 rounded-lg text-sm font-semibold text-left transition-all"
                      style={{background:isSel?"var(--hover)":"var(--panel)",border:isSel?"2px solid var(--accent)":"1px solid var(--border)",
                        color:isSel?"var(--accent)":"var(--text)",cursor:(!isSel&&soSelected.length>=10)?"not-allowed":"pointer",opacity:(!isSel&&soSelected.length>=10)?0.45:1}}>
                      {isSel?"✓ ":""}{name}
                      {n.nickname!==name&&<span className="block text-xs mt-0.5" style={{color:"var(--text-dim)"}}>{n.nickname}</span>}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{color:"var(--text-muted)"}}>공 개수</span>
                  <div className="flex items-center gap-1.5">
                    {[1,2,3,4,5].map(n=>(
                      <button key={n} onClick={()=>setSoBallCount(n)}
                        className="w-8 h-8 rounded-full text-sm font-bold transition-all"
                        style={{background:soBallCount===n?"var(--accent)":"var(--hover)",
                          color:soBallCount===n?"#fff":"var(--text-muted)",
                          border:soBallCount===n?"2px solid var(--accent)":"1px solid var(--border)",cursor:"pointer"}}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs" style={{color:"var(--text-dim)"}}>인당 {soBallCount}개</span>
                </div>
                <button onClick={()=>setSoStep("play")} disabled={soSelected.length<2}
                  className="px-8 py-3 rounded-full font-bold text-base"
                  style={{background:soSelected.length<2?"var(--border)":"var(--accent)",color:"#fff",cursor:soSelected.length<2?"not-allowed":"pointer",opacity:soSelected.length<2?0.6:1}}>
                  🎮 핀볼 시작 ({soSelected.length}명)
                </button>
              </div>
            </div>
          ):(
            <div>
              <div className="flex justify-between items-center mb-4">
                <button onClick={()=>{setSoStep("select");}}
                  className="text-xs px-3 py-1.5 rounded-full font-semibold"
                  style={{background:"var(--hover)",color:"var(--text-muted)",border:"1px solid var(--border)",cursor:"pointer"}}>← 참여자 변경</button>
                <span className="text-sm font-bold" style={{color:"var(--text-muted)"}}>{soSelected.length}명 참여</span>
              </div>
              <div className="flex justify-center">
                <PinballGame players={soPinballPlayers} ballCount={soBallCount}/>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 다른 미니게임 (독립 실행) */}
      {soGame!=="pinball"&&(
        <div className="rounded-xl p-6" style={{background:"var(--panel)",border:"1px solid var(--border)"}}>
          <p className="text-center text-sm font-semibold mb-6" style={{color:"var(--text-muted)"}}>
            {soGame==="coin"?"동전을 던져 결과를 확인하세요":soGame==="shuriken"?"표창을 던져 더 가까이 맞힌 팀이 블루 사이드!":"두루마리 하나를 골라 진영을 결정하세요"}
          </p>
          <div className="flex justify-center">
            {soGame==="shuriken"&&<ShurikenGame onResult={()=>{}}/>}
            {soGame==="coin"&&<CoinGame onResult={()=>{}}/>}
            {soGame==="scroll"&&<ScrollGame onResult={()=>{}}/>}
          </div>
        </div>
      )}
    </div>
  );

  // ── TEAM MODE ─────────────────────────────────────────────────────────────
  return(
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={goHome} className="text-sm px-3 py-1.5 rounded-full font-semibold"
          style={{background:"var(--hover)",color:"var(--text-muted)",border:"1px solid var(--border)",cursor:"pointer"}}>← 홈</button>
        <h2 className="text-xl font-bold" style={{color:"var(--accent)"}}>🎮 팀 정하기</h2>
        {teamStep!=="select"&&(
          <button onClick={resetTeam} className="ml-auto text-sm px-3 py-1.5 rounded-full font-semibold"
            style={{background:"var(--hover)",color:"var(--text-muted)",border:"1px solid var(--border)",cursor:"pointer"}}>처음으로</button>
        )}
      </div>

      {/* Step 1: 플레이어 선택 */}
      {teamStep==="select"&&(
        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm" style={{color:"var(--text-muted)"}}>오늘 참여할 플레이어를 선택하세요 (최대 10명)</p>
            <span className="text-sm font-bold" style={{color:"var(--accent)"}}>{selected.length}명</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6">
            {nicknames.map(n=>{
              const isSel=selected.includes(n.id);
              const name=n.realName?.trim()||n.nickname;
              return(
                <button key={n.id} onClick={()=>toggleSelect(n.id)}
                  className="px-3 py-2.5 rounded-lg text-sm font-semibold text-left transition-all"
                  style={{background:isSel?"var(--hover)":"var(--panel)",border:isSel?"2px solid var(--accent)":"1px solid var(--border)",
                    color:isSel?"var(--accent)":"var(--text)",cursor:(!isSel&&selected.length>=10)?"not-allowed":"pointer",opacity:(!isSel&&selected.length>=10)?0.45:1}}>
                  {isSel?"✓ ":""}{name}
                  {n.nickname!==name&&<span className="block text-xs mt-0.5" style={{color:"var(--text-dim)"}}>{n.nickname}</span>}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center">
            <button onClick={()=>setTeamStep("assign")} disabled={selected.length<2}
              className="px-8 py-3 rounded-full font-bold text-base"
              style={{background:selected.length<2?"var(--border)":"var(--accent)",color:"#fff",cursor:selected.length<2?"not-allowed":"pointer",opacity:selected.length<2?0.6:1}}>
              팀 배정하기 ({selected.length}명)
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 팀 배정 */}
      {teamStep==="assign"&&(
        <div>
          <p className="text-sm mb-5" style={{color:"var(--text-muted)"}}>각 플레이어를 팀 1 또는 팀 2로 배정하세요</p>
          {unassigned.length>0&&(
            <div className="mb-5">
              <div className="text-xs font-bold mb-2" style={{color:"var(--text-muted)"}}>미배정</div>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(id=>(
                  <div key={id} className="flex items-center gap-1 rounded-lg px-2 py-1.5" style={{background:"var(--panel)",border:"1px solid var(--border)"}}>
                    <span className="text-sm font-semibold" style={{color:"var(--text)"}}>{displayName(id)}</span>
                    <button onClick={()=>assignTo(id,1)} disabled={team1.length>=5} className="text-xs px-1.5 py-0.5 rounded font-bold ml-1"
                      style={{background:team1.length>=5?"#e5e7eb":"#dbeafe",color:team1.length>=5?"#9ca3af":"#1d4ed8",cursor:team1.length>=5?"not-allowed":"pointer"}}>팀1</button>
                    <button onClick={()=>assignTo(id,2)} disabled={team2.length>=5} className="text-xs px-1.5 py-0.5 rounded font-bold"
                      style={{background:team2.length>=5?"#e5e7eb":"#fee2e2",color:team2.length>=5?"#9ca3af":"#b91c1c",cursor:team2.length>=5?"not-allowed":"pointer"}}>팀2</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {([team1,team2] as const).map((t,i)=>(
              <div key={i} className="rounded-xl p-4" style={{background:i===0?"#eff6ff":"#fff1f2",border:i===0?"2px solid #3b82f6":"2px solid #ef4444"}}>
                <div className="font-bold text-sm mb-3" style={{color:i===0?"#1d4ed8":"#b91c1c"}}>{i===0?"🔵 팀 1":"🔴 팀 2"}<span className="ml-2 font-normal text-xs">({t.length}명)</span></div>
                <div className="space-y-2">
                  {t.map(id=>(
                    <div key={id} className="rounded-lg px-2 py-1.5" style={{background:i===0?"#dbeafe88":"#fee2e288",border:i===0?"1px solid #93c5fd":"1px solid #fca5a5"}}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold" style={{color:i===0?"#1d4ed8":"#b91c1c"}}>{displayName(id)}</span>
                        <span onClick={()=>{unassign(id);setPositions(p=>{const n={...p};delete n[id];return n;})}} className="text-xs cursor-pointer opacity-50 hover:opacity-100" style={{color:i===0?"#1d4ed8":"#b91c1c"}}>×</span>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {LANE_LIST.map(pos=>{
                          const active=positions[id]===pos,takenByOther=t.some(pid=>pid!==id&&positions[pid]===pos);
                          return(<button key={pos} onClick={()=>setPlayerPos(id,pos,t)} className="text-xs px-1.5 py-0.5 rounded font-bold transition-all"
                            style={{background:active?LANE_COLORS[pos]:takenByOther?"transparent":LANE_COLORS[pos]+"22",
                              color:active?"#fff":takenByOther?"var(--text-dim)":LANE_COLORS[pos],
                              border:`1px solid ${active?LANE_COLORS[pos]:takenByOther?"var(--border)":LANE_COLORS[pos]+"66"}`,
                              opacity:takenByOther?0.35:1,cursor:"pointer"}}>{pos}</button>);
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <button onClick={()=>setTeamStep("game")} disabled={!assignReady}
              className="px-8 py-3 rounded-full font-bold text-base"
              style={{background:!assignReady?"var(--border)":"var(--accent)",color:"#fff",cursor:!assignReady?"not-allowed":"pointer",opacity:!assignReady?0.6:1}}>
              {unassigned.length>0?`${unassigned.length}명 미배정`:"미니게임으로 진영 결정 →"}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 미니게임 */}
      {teamStep==="game"&&(
        <div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {[team1,team2].map((t,i)=>(
              <div key={i} className="rounded-lg p-3" style={{background:"var(--panel)",border:"1px solid var(--border)"}}>
                <div className="text-xs font-bold mb-1.5" style={{color:i===0?"#1d4ed8":"#b91c1c"}}>팀 {i+1}</div>
                {t.map(id=>(
                  <div key={id} className="text-sm py-0.5 font-semibold flex items-center gap-1.5" style={{color:"var(--text)"}}>
                    {positions[id]&&<span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{background:LANE_COLORS[positions[id]]+"22",color:LANE_COLORS[positions[id]],minWidth:28,textAlign:"center"}}>{positions[id]}</span>}
                    {displayName(id)}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="rounded-xl p-6" style={{background:"var(--panel)",border:"1px solid var(--border)"}}>
            <p className="text-center text-sm font-semibold mb-4" style={{color:"var(--text-muted)"}}>미니게임으로 팀 1의 진영을 결정하세요!</p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {MINI_GAMES.map(g=>(
                <button key={g.id} onClick={()=>{setTeamMiniGame(g.id);setSideResult(null);}}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{background:teamMiniGame===g.id?"var(--accent)":"var(--hover)",color:teamMiniGame===g.id?"#fff":"var(--text-muted)",
                    border:teamMiniGame===g.id?"none":"1px solid var(--border)",cursor:"pointer"}}>
                  {g.label}
                </button>
              ))}
            </div>
            <div className="flex justify-center">
              {teamMiniGame==="shuriken"&&<ShurikenGame key="shuriken" onResult={handleGameResult}/>}
              {teamMiniGame==="coin"&&<CoinGame key="coin" onResult={handleGameResult}/>}
              {teamMiniGame==="scroll"&&<ScrollGame key="scroll" onResult={handleGameResult}/>}
              {teamMiniGame==="pinball"&&(
                <PinballGame key="pinball" players={teamPinballPlayers}
                  onResult={(_,side)=>handleGameResult(side)}/>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 4: 결과 */}
      {teamStep==="result"&&(
        <div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            {(["blue","red"] as const).map(color=>{
              const sideNum=color==="blue"?blueSide:blueSide===1?2:1;
              const players=sideNum===1?team1:team2;
              return(
                <div key={color} className="rounded-xl p-5"
                  style={{background:color==="blue"?"linear-gradient(135deg,#eff6ff,#dbeafe)":"linear-gradient(135deg,#fff1f2,#fee2e2)",
                    border:color==="blue"?"2px solid #3b82f6":"2px solid #ef4444",
                    boxShadow:color==="blue"?"0 4px 16px rgba(59,130,246,0.15)":"0 4px 16px rgba(239,68,68,0.15)"}}>
                  <div className="flex items-center gap-2 mb-3">
                    <span style={{fontSize:20}}>{color==="blue"?"🔵":"🔴"}</span>
                    <span className="font-black text-sm" style={{color:color==="blue"?"#1d4ed8":"#b91c1c"}}>{color==="blue"?"블루 사이드":"레드 사이드"}</span>
                  </div>
                  {LANE_LIST.filter(pos=>players.some(id=>positions[id]===pos)).map(pos=>{
                    const pid=players.find(id=>positions[id]===pos)!;
                    return(<div key={pos} className="py-0.5 font-semibold text-sm flex items-center gap-2" style={{color:color==="blue"?"#1e40af":"#991b1b"}}>
                      <span className="text-xs font-bold" style={{color:LANE_COLORS[pos],minWidth:28}}>{pos}</span>{displayName(pid)}
                    </div>);
                  })}
                  {players.filter(id=>!positions[id]).map(id=>(
                    <div key={id} className="py-0.5 font-semibold text-sm" style={{color:color==="blue"?"#1e40af":"#991b1b"}}>{displayName(id)}</div>
                  ))}
                </div>
              );
            })}
          </div>
          <div className="rounded-lg p-4 mb-5" style={{background:"var(--panel)",border:"1px solid var(--border)"}}>
            <div className="text-xs font-bold mb-3" style={{color:"var(--text-muted)"}}>📋 공지 설정</div>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <div className="text-xs mb-1.5" style={{color:"var(--text-dim)"}}>시리즈 형식</div>
                <div className="flex gap-2">
                  {(["3판2선","5판3선"] as const).map(fmt=>(
                    <button key={fmt} onClick={()=>setAnnounceFormat(fmt)} className="px-3 py-1.5 rounded text-sm font-semibold"
                      style={{background:announceFormat===fmt?"var(--accent)":"var(--panel-alt)",color:announceFormat===fmt?"#fff":"var(--text-muted)",
                        border:`1px solid ${announceFormat===fmt?"var(--accent)":"var(--border)"}`,cursor:"pointer"}}>{fmt}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{color:"var(--text-dim)"}}>날짜</div>
                <input type="date" value={announceDate} onChange={e=>setAnnounceDate(e.target.value)}
                  className="px-3 py-1.5 rounded text-sm outline-none"
                  style={{background:"var(--panel-alt)",border:"1px solid var(--border)",color:"var(--text)",cursor:"pointer"}}/>
              </div>
              <div>
                <div className="text-xs mb-1.5" style={{color:"var(--text-dim)"}}>시간</div>
                <input type="time" value={announceTime} onChange={e=>setAnnounceTime(e.target.value)}
                  className="px-3 py-1.5 rounded text-sm outline-none"
                  style={{background:"var(--panel-alt)",border:"1px solid var(--border)",color:"var(--text)",cursor:"pointer"}}/>
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-3 flex-wrap mb-5">
            <button onClick={copyAnnouncement} className="px-5 py-2.5 rounded-full font-bold text-sm"
              style={{background:copied?"#16a34a":"var(--accent)",color:"#fff",cursor:"pointer",transition:"background 0.2s"}}>
              {copied?"✓ 복사 완료!":"📋 공지 복사하기"}
            </button>
            <button onClick={()=>{setTeamStep("game");setSideResult(null);setBlueSide(null);}}
              className="px-5 py-2.5 rounded-full font-bold text-sm"
              style={{background:"var(--hover)",color:"var(--accent)",border:"1px solid var(--border-green)",cursor:"pointer"}}>
              진영 다시 뽑기
            </button>
            <button onClick={resetTeam} className="px-5 py-2.5 rounded-full font-bold text-sm"
              style={{background:"var(--hover)",color:"var(--text-muted)",border:"1px solid var(--border)",cursor:"pointer"}}>
              처음으로
            </button>
          </div>
          <div className="rounded-lg p-4 text-sm" style={{background:"var(--panel-alt)",border:"1px solid var(--border)",color:"var(--text-muted)",whiteSpace:"pre-line",fontFamily:"monospace"}}>
            {getAnnouncement()}
          </div>
        </div>
      )}
    </div>
  );
}
