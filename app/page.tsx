"use client";

import { FormEvent, useEffect, useState } from "react";

const GOAL = 5000;
const LEAF_COUNT = 60;

type RankingEntry = { schoolGroup: string; name: string; total: number };

export default function Home() {
  const [prayerCount, setPrayerCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schoolGroup, setSchoolGroup] = useState("");
  const [studentName, setStudentName] = useState("");
  const [prayerDate, setPrayerDate] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);

  const fetchRanking = () => {
    fetch("/api/prayers/ranking").then(async (response) => await response.json() as { configured?: boolean; entries?: RankingEntry[] }).then((data) => {
      if (data.configured && Array.isArray(data.entries)) setRanking(data.entries);
    }).catch(() => undefined);
  };

  useEffect(() => {
    try {
      const profile = JSON.parse(window.localStorage.getItem("prayer-tree-profile") ?? "null") as { schoolGroup?: string; name?: string } | null;
      if (profile?.schoolGroup) setSchoolGroup(profile.schoolGroup);
      if (profile?.name) setStudentName(profile.name);
    } catch {
      window.localStorage.removeItem("prayer-tree-profile");
    }

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    setPrayerDate(`${yyyy}-${mm}-${dd}`);

    fetch("/api/prayers").then(async (response) => await response.json() as { configured?: boolean; total?: number }).then((data) => {
      if (data.configured && typeof data.total === "number") setTotalCount(data.total);
      else {
        const storedCount = Number(window.localStorage.getItem("prayer-tree-total") ?? 0);
        if (Number.isFinite(storedCount)) setTotalCount(Math.min(Math.max(storedCount, 0), GOAL));
      }
    }).catch(() => undefined);

    fetchRanking();
  }, []);

  const progress = Math.min((totalCount / GOAL) * 100, 100);
  const filledLeaves = totalCount === 0 ? 0 : Math.max(1, Math.ceil((totalCount / GOAL) * LEAF_COUNT));
  const stage = progress >= 100 ? "기도나무 완성" : progress >= 70 ? "열매 맺는 중" : progress >= 35 ? "잎이 자라는 중" : progress > 0 ? "새싹이 자라는 중" : "첫 기도를 기다려요";

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
      fetchRanking();
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
        <input name="prayerDate" type="date" value={prayerDate} onChange={(event) => { setPrayerDate(event.target.value); setSaved(false); }} required />
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

    <section className="ranking" aria-labelledby="ranking-title">
      <h2 id="ranking-title">누가 기도나무가 잘 자라도록 만들었을까요?</h2>
      {ranking.length === 0 ? <p className="rankingEmpty">아직 순위에 오른 기도가 없어요.</p> : <ol className="rankingList">
        {ranking.map((entry, index) => <li key={`${entry.schoolGroup}-${entry.name}-${index}`}>
          <span className="rankingRank">{index + 1}</span>
          <span className="rankingName">{entry.name}<small>{entry.schoolGroup}</small></span>
          <span className="rankingCount">{entry.total.toLocaleString()}회</span>
        </li>)}
      </ol>}
    </section>

    <p className="closing">기도가 쌓일수록 우리의 나무가 자라납니다.</p>
  </main>;
}
