"use client";

import { FormEvent, useEffect, useState } from "react";

const GOAL = 5000;

const CANOPY_RINGS = [
  { cy: 56, ry: 17, rx: 76, count: 7, r: 15 },
  { cy: 80, ry: 21, rx: 104, count: 9, r: 16 },
  { cy: 106, ry: 24, rx: 120, count: 10, r: 16 },
  { cy: 130, ry: 21, rx: 106, count: 9, r: 15 },
  { cy: 152, ry: 15, rx: 80, count: 7, r: 13 },
];

const round2 = (value: number) => Math.round(value * 100) / 100;

const CANOPY_SPOTS = CANOPY_RINGS.flatMap((ring, ringIndex) => Array.from({ length: ring.count }, (_, i) => {
  const t = (i + (ringIndex % 2 === 0 ? 0 : 0.5)) / ring.count;
  const angle = t * Math.PI * 2;
  return { cx: round2(150 + Math.cos(angle) * ring.rx), cy: round2(ring.cy + Math.sin(angle) * ring.ry), r: ring.r };
}));

const BLOSSOM_TONES = ["#ffffff", "#fdeceb", "#f8d6d2", "#f3a29e"];

const FRUIT_SPOTS = [
  { cx: 92, cy: 118, r: 11 },
  { cx: 208, cy: 118, r: 11 },
  { cx: 116, cy: 150, r: 10 },
  { cx: 184, cy: 150, r: 10 },
  { cx: 150, cy: 160, r: 11 },
  { cx: 70, cy: 92, r: 10 },
  { cx: 230, cy: 92, r: 10 },
  { cx: 150, cy: 76, r: 10 },
];

export default function Home() {
  const [prayerCount, setPrayerCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schoolGroup, setSchoolGroup] = useState("");
  const [studentName, setStudentName] = useState("");

  useEffect(() => {
    try {
      const profile = JSON.parse(window.localStorage.getItem("prayer-tree-profile") ?? "null") as { schoolGroup?: string; name?: string } | null;
      if (profile?.schoolGroup) setSchoolGroup(profile.schoolGroup);
      if (profile?.name) setStudentName(profile.name);
    } catch {
      window.localStorage.removeItem("prayer-tree-profile");
    }

    fetch("/api/prayers").then(async (response) => await response.json() as { configured?: boolean; total?: number }).then((data) => {
      if (data.configured && typeof data.total === "number") setTotalCount(data.total);
      else {
        const storedCount = Number(window.localStorage.getItem("prayer-tree-total") ?? 0);
        if (Number.isFinite(storedCount)) setTotalCount(Math.min(Math.max(storedCount, 0), GOAL));
      }
    }).catch(() => undefined);
  }, []);

  const progress = Math.min((totalCount / GOAL) * 100, 100);
  const stage = progress >= 100 ? "기도나무 완성" : progress >= 70 ? "열매 맺는 중" : progress >= 35 ? "잎이 자라는 중" : progress > 0 ? "새싹이 자라는 중" : "첫 기도를 기다려요";

  const bloomShare = Math.min(progress, 70) / 70;
  const fruitShare = progress > 70 ? (progress - 70) / 30 : 0;
  const filledBlossoms = progress <= 0 ? 0 : Math.max(1, Math.round(bloomShare * CANOPY_SPOTS.length));
  const filledFruit = fruitShare <= 0 ? 0 : Math.max(1, Math.round(fruitShare * FRUIT_SPOTS.length));

  const submitPrayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    window.localStorage.setItem("prayer-tree-profile", JSON.stringify({ schoolGroup, name: studentName }));
    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolGroup, name: studentName, prayerDate: form.get("prayerDate"), prayerCount }),
      });
      if (!response.ok) throw new Error("database unavailable");
      const data = await response.json() as { total: number };
      setTotalCount(data.total);
    } catch {
      const nextTotal = Math.min(totalCount + prayerCount, GOAL);
      setTotalCount(nextTotal);
      window.localStorage.setItem("prayer-tree-total", String(nextTotal));
    } finally {
      setSaved(true);
      setSubmitting(false);
    }
  };

  return <main>
    <section className="intro">
      <div className="clouds" aria-hidden="true">
        <span className="cloud" style={{ width: 120, height: 44, left: 0, top: 10 }} />
        <span className="cloud" style={{ width: 80, height: 32, left: 80, top: 0 }} />
        <span className="cloud" style={{ width: 150, height: 52, right: 60, top: 20 }} />
        <span className="cloud" style={{ width: 90, height: 36, right: 0, top: 6 }} />
      </div>
      <div className="ribbonWrap"><div className="ribbon"><span>중등부 500명의 예배자</span></div></div>
      <h1>기도<span>나무</span></h1>
      <p className="description">한 번의 기도가 모여 한 그루의 나무가 됩니다.</p>
    </section>

    <section className="goalCard" aria-labelledby="goal-title">
      <div className="goalCopy">
        <p className="goalEyebrow">우리의 공동 목표</p>
        <h2 id="goal-title"><strong>{totalCount.toLocaleString()}회</strong><span>의 기도가 모였어요</span></h2>
        <p>{stage}</p>
        <div className="goalTrack" role="progressbar" aria-label="전체 기도 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="treeVisual" aria-label={`기도 ${totalCount.toLocaleString()}회로 자라난 기도나무 - ${stage}`}>
        <svg className="treeSvg" viewBox="0 0 300 340" aria-hidden="true">
          <ellipse cx="150" cy="103" rx="134" ry="100" fill="#ffffff" opacity="0.5" />
          {CANOPY_SPOTS.map((spot, index) => {
            const filled = index < filledBlossoms;
            const fill = filled ? (index % 5 === 4 ? "#4f8b2c" : BLOSSOM_TONES[index % BLOSSOM_TONES.length]) : "#e7ece1";
            return <circle key={index} cx={spot.cx} cy={spot.cy} r={spot.r} fill={fill} stroke={filled ? "none" : "#d7d2ca"} strokeWidth={1.5} />;
          })}
          {FRUIT_SPOTS.map((spot, index) => index < filledFruit && <g key={index}>
            <line x1={spot.cx} y1={spot.cy - spot.r - 6} x2={spot.cx} y2={spot.cy - spot.r + 2} stroke="#356b1c" strokeWidth={2} />
            <circle cx={spot.cx} cy={spot.cy} r={spot.r} fill="#efa400" />
            <circle cx={spot.cx - spot.r * 0.3} cy={spot.cy - spot.r * 0.3} r={spot.r * 0.28} fill="#fff6e0" opacity={0.6} />
          </g>)}
          <path d="M132,182 C130,222 128,254 134,290 L166,290 C172,254 170,222 168,182 Z" fill="#d8c2a7" />
          <path d="M144,197 C142,226 141,254 145,284" stroke="#9f632e" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.5} />
          <path d="M158,201 C160,230 161,256 157,286" stroke="#9f632e" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.5} />
          <path d="M0,302 C38,288 68,302 100,294 C130,286 152,300 182,292 C212,284 242,302 272,294 C286,290 296,297 300,294 L300,340 L0,340 Z" fill="#a8d477" />
          <path d="M0,302 C38,288 68,302 100,294 C130,286 152,300 182,292 C212,284 242,302 272,294 C286,290 296,297 300,294" fill="none" stroke="#356b1c" strokeWidth={2} opacity={0.22} />
          <g fill="#356b1c" opacity={0.5}>
            <path d="M36,294 l-4,-15 l8,0 Z" />
            <path d="M92,292 l-4,-17 l9,0 Z" />
            <path d="M152,298 l-4,-16 l8,0 Z" />
            <path d="M208,290 l-4,-17 l9,0 Z" />
            <path d="M258,296 l-4,-15 l8,0 Z" />
          </g>
        </svg>
      </div>
    </section>

    <form className="prayerForm" onSubmit={submitPrayer}>
      <div className="formHeader">
        <h2>나의 기도 기록</h2>
        <span className="todayBadge">오늘의 한 걸음</span>
      </div>

      <label className="field">
        <span>학년 · 반</span>
        <select name="schoolGroup" value={schoolGroup} onChange={(event) => { setSchoolGroup(event.target.value); setSaved(false); }} required>
          <option value="" disabled>학년 · 반 선택</option>
          <option>1-1반</option><option>1-2반</option><option>1-3반</option><option>1-4반</option><option>1-5반</option><option>1-6반</option>
          <option>2-1반</option><option>2-2반</option><option>2-3반</option><option>2-4반</option><option>2-5반</option><option>2-6반</option><option>2-7반</option>
          <option>3-1반</option><option>3-2반</option><option>3-3반</option><option>3-4반</option><option>3-5반</option>
          <option>신입1반</option><option>신입2반</option><option>신입3반</option><option>신입4반</option>
          <option>교사</option><option>교역자</option>
        </select>
      </label>

      <label className="field">
        <span>이름</span>
        <input name="name" type="text" value={studentName} onChange={(event) => { setStudentName(event.target.value); setSaved(false); }} autoComplete="name" placeholder="이름을 입력해 주세요" required />
      </label>

      <label className="field">
        <span>날짜</span>
        <input name="prayerDate" type="date" defaultValue="2026-08-30" required />
      </label>

      <fieldset className="countField">
        <legend>기도 횟수</legend>
        <div className="countGrid">
          {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <button
            type="button" key={count} className={prayerCount === count ? "selected" : ""}
            onClick={() => { setPrayerCount(count); setSaved(false); }} aria-pressed={prayerCount === count}
          ><strong>{count}</strong><small>회</small></button>)}
        </div>
      </fieldset>

      <button className="submitButton" type="submit" disabled={submitting}>{submitting ? "기록 중..." : saved ? `${prayerCount}회 기도 기록 완료` : "기도 기록하기"}</button>
      {saved && <p className="successMessage" role="status" aria-live="polite">기도 {prayerCount}회가 잘 기록되었어요!</p>}
    </form>

    <p className="closing">기도가 쌓일수록 우리의 나무가 자라납니다.</p>
  </main>;
}
