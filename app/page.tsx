"use client";

import { FormEvent, useEffect, useState } from "react";

const GOAL = 5000;
const LEAF_COUNT = 60;

export default function Home() {
  const [prayerCount, setPrayerCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/prayers").then(async (response) => await response.json() as { configured?: boolean; total?: number }).then((data) => {
      if (data.configured && typeof data.total === "number") setTotalCount(data.total);
      else {
        const storedCount = Number(window.localStorage.getItem("prayer-tree-total") ?? 0);
        if (Number.isFinite(storedCount)) setTotalCount(Math.min(Math.max(storedCount, 0), GOAL));
      }
    }).catch(() => undefined);
  }, []);

  const progress = Math.min((totalCount / GOAL) * 100, 100);
  const filledLeaves = totalCount === 0 ? 0 : Math.max(1, Math.ceil((totalCount / GOAL) * LEAF_COUNT));
  const stage = progress >= 100 ? "기도나무 완성" : progress >= 70 ? "열매 맺는 중" : progress >= 35 ? "잎이 자라는 중" : progress > 0 ? "새싹이 자라는 중" : "첫 기도를 기다려요";

  const submitPrayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolGroup: form.get("schoolGroup"), name: form.get("name"), prayerDate: form.get("prayerDate"), prayerCount }),
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
      <p className="audience">중등부 500명의 예배자</p>
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

      <div className="treeVisual" aria-label={`기도 ${totalCount.toLocaleString()}회로 ${progress.toFixed(1)}퍼센트 채워진 나무`}>
        <div className="canopy" aria-hidden="true">
          {Array.from({ length: LEAF_COUNT }, (_, index) => <span key={index} className={index >= LEAF_COUNT - filledLeaves ? "filled" : ""} />)}
        </div>
        <div className="treeTrunk" aria-hidden="true"><span style={{ height: `${Math.max(progress, 4)}%` }} /></div>
        <div className="treeGround" aria-hidden="true" />
      </div>
    </section>

    <form className="prayerForm" onSubmit={submitPrayer}>
      <div className="formHeader">
        <h2>나의 기도 기록</h2>
        <span className="todayBadge">오늘의 한 걸음</span>
      </div>

      <label className="field">
        <span>학년 · 반</span>
        <select name="schoolGroup" defaultValue="교사">
          <option>1학년</option><option>2학년</option><option>3학년</option><option>교사</option>
        </select>
      </label>

      <label className="field">
        <span>이름</span>
        <input name="name" type="text" defaultValue="박성호" required />
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
