"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import MyStatusModal from "./MyStatusModal";
import DailyLimitModal from "./DailyLimitModal";
import AnnouncementModal, { shouldShowAnnouncement } from "./AnnouncementModal";

const GOAL = 5000;
const LEAF_COUNT = 60;
const RANKING_PAGE_SIZE = 20;

type RankingEntry = { schoolGroup: string; name: string; total: number };
type RankedEntry = RankingEntry & { rank: number };

const STAFF_GROUPS = ["교사", "교역자"];
const DURATION_OPTIONS = Array.from({ length: 10 }, (_, index) => (index + 1) * 30);

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${minutes}분(${hours}시간${rest === 0 ? "" : ` ${rest}분`})`;
}

function minutesToPrayerCount(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return null;
  const count = Math.min(10, Math.floor(minutes / 30));
  return count > 0 ? count : null;
}

const COUNTDOWN_TARGET = new Date(2026, 9, 11, 0, 0, 0).getTime();

type Countdown = { days: number; hours: number; minutes: number; seconds: number; done: boolean };

function getCountdown(): Countdown {
  const diff = Math.max(0, COUNTDOWN_TARGET - Date.now());
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, done: diff <= 0 };
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export default function Home() {
  const [prayerCount, setPrayerCount] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [schoolGroup, setSchoolGroup] = useState("");
  const [studentName, setStudentName] = useState("");
  const [prayerDate, setPrayerDate] = useState("");
  const [minPrayerDate, setMinPrayerDate] = useState("");
  const [maxPrayerDate, setMaxPrayerDate] = useState("");
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [prayerMinutes, setPrayerMinutes] = useState("");
  const [customMinutes, setCustomMinutes] = useState("");
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [rankingPage, setRankingPage] = useState(0);
  const [showMyStatus, setShowMyStatus] = useState(false);
  const [dailyWarning, setDailyWarning] = useState<{ date: string } | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  const isStaff = STAFF_GROUPS.includes(schoolGroup);

  const fetchRanking = () => {
    fetch("/api/prayers/ranking").then(async (response) => await response.json() as { configured?: boolean; entries?: RankingEntry[] }).then((data) => {
      if (data.configured && Array.isArray(data.entries)) {
        setRanking(data.entries);
        setRankingPage(0);
      }
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

    const toDateInput = (date: Date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    const today = new Date();
    setPrayerDate(toDateInput(today));
    setMaxPrayerDate(toDateInput(today));
    setMinPrayerDate(toDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)));

    fetch("/api/prayers").then(async (response) => await response.json() as { configured?: boolean; total?: number }).then((data) => {
      if (data.configured && typeof data.total === "number") setTotalCount(data.total);
      else {
        const storedCount = Number(window.localStorage.getItem("prayer-tree-total") ?? 0);
        if (Number.isFinite(storedCount)) setTotalCount(Math.min(Math.max(storedCount, 0), GOAL));
      }
    }).catch(() => undefined);

    fetchRanking();

    if (shouldShowAnnouncement()) setShowAnnouncement(true);
  }, []);

  useEffect(() => {
    setCountdown(getCountdown());
    const timer = setInterval(() => setCountdown(getCountdown()), 1000);
    return () => clearInterval(timer);
  }, []);

  const rankedEntries = useMemo<RankedEntry[]>(
    // `ranking` is already sorted by total desc, so equal totals are contiguous:
    // the first index sharing a total is exactly its competition rank.
    () => ranking.map((entry) => ({ ...entry, rank: ranking.findIndex((other) => other.total === entry.total) + 1 })),
    [ranking],
  );

  const rankingPageCount = Math.max(1, Math.ceil(rankedEntries.length / RANKING_PAGE_SIZE));
  const rankingPageItems = useMemo(
    () => rankedEntries.slice(rankingPage * RANKING_PAGE_SIZE, rankingPage * RANKING_PAGE_SIZE + RANKING_PAGE_SIZE),
    [rankedEntries, rankingPage],
  );

  const progress = Math.min((totalCount / GOAL) * 100, 100);
  const filledLeaves = totalCount === 0 ? 0 : Math.max(1, Math.ceil((totalCount / GOAL) * LEAF_COUNT));
  const stage = progress >= 100 ? "기도나무 완성" : progress >= 70 ? "열매 맺는 중" : progress >= 35 ? "잎이 자라는 중" : progress > 0 ? "새싹이 자라는 중" : "첫 기도를 기다려요";

  const handleSchoolGroupChange = (value: string) => {
    setSchoolGroup(value);
    setSaved(false);
    if (!STAFF_GROUPS.includes(value)) {
      setPrayerMinutes("");
      setCustomMinutes("");
    }
  };

  const handleDurationChange = (value: string) => {
    setPrayerMinutes(value);
    setSaved(false);
    const minutes = value === "custom" ? Number(customMinutes) : Number(value);
    const count = minutesToPrayerCount(minutes);
    if (count) setPrayerCount(count);
  };

  const handleCustomMinutesChange = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, "");
    setCustomMinutes(digitsOnly);
    setSaved(false);
    const count = minutesToPrayerCount(Number(digitsOnly));
    if (count) setPrayerCount(count);
  };

  const handlePrayerCountChange = (count: number) => {
    setPrayerCount(count);
    setSaved(false);
    if (isStaff) {
      setPrayerMinutes(String(count * 30));
      setCustomMinutes("");
    }
  };

  const performSubmit = async (date: string) => {
    setSubmitting(true);
    window.localStorage.setItem("prayer-tree-profile", JSON.stringify({ schoolGroup, name: studentName }));
    try {
      const response = await fetch("/api/prayers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolGroup, name: studentName, prayerDate: date, prayerCount }),
      });
      if (response.status === 409) {
        setDailyWarning({ date });
        return;
      }
      if (!response.ok) throw new Error("database unavailable");
      const data = await response.json() as { total: number };
      setTotalCount(data.total);
      fetchRanking();
      setSaved(true);
      setDailyWarning(null);
    } catch {
      const nextTotal = Math.min(totalCount + prayerCount, GOAL);
      setTotalCount(nextTotal);
      window.localStorage.setItem("prayer-tree-total", String(nextTotal));
      setSaved(true);
      setDailyWarning(null);
    } finally {
      setSubmitting(false);
    }
  };

  const submitPrayer = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const date = String(form.get("prayerDate"));
    await performSubmit(date);
  };

  return <main>
    <section className="intro">
      <p className="audience">중등부 500명의 예배자</p>
      <h1>기도<span>나무</span></h1>
      <p className="description">한 번의 기도가 모여 한 그루의 나무가 됩니다.</p>

      {countdown && <div className="countdown">
        {countdown.done ? <p className="countdownDone">10월 11일, 기도의 날이 밝았어요!</p> : <>
          <div className="countdownBlocks">
            <div className="countdownBlock"><strong>{pad2(countdown.days)}</strong><span>일</span></div>
            <span className="countdownSep">-</span>
            <div className="countdownBlock"><strong>{pad2(countdown.hours)}</strong><span>시간</span></div>
            <span className="countdownSep">-</span>
            <div className="countdownBlock"><strong>{pad2(countdown.minutes)}</strong><span>분</span></div>
            <span className="countdownSep">-</span>
            <div className="countdownBlock"><strong>{pad2(countdown.seconds)}</strong><span>초</span></div>
          </div>
          <p className="countdownLabel">10월 11일 주일까지 남은 시간</p>
        </>}
      </div>}
    </section>

    <section className="goalCard" aria-labelledby="goal-title">
      <div className="goalCopy">
        <p className="goalEyebrow">10.11.(주일) 올인 500명의 예배자_영혼의 때를 위하여</p>
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

    <button type="button" className="myStatusOpenButton" onClick={() => setShowMyStatus(true)}>내 기도 현황 확인하기</button>

    <form className="prayerForm" onSubmit={submitPrayer}>
      <div className="formHeader">
        <h2>나의 기도 기록</h2>
        <span className="todayBadge">오늘의 한 걸음</span>
      </div>

      <label className="field">
        <span>학년 · 반</span>
        <select name="schoolGroup" value={schoolGroup} onChange={(event) => handleSchoolGroupChange(event.target.value)} required>
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
        <input name="prayerDate" type="date" value={prayerDate} min={minPrayerDate} max={maxPrayerDate} onChange={(event) => { setPrayerDate(event.target.value); setSaved(false); }} required />
      </label>

      {isStaff && <label className="field">
        <span>기도시간(분){isStaff && <em className="linkedNote">기도 횟수와 연동돼요</em>}</span>
        <select className={isStaff ? "linked" : ""} value={prayerMinutes} onChange={(event) => handleDurationChange(event.target.value)} required>
          <option value="" disabled>기도시간 선택</option>
          {DURATION_OPTIONS.map((minutes) => <option key={minutes} value={minutes}>{formatDuration(minutes)}</option>)}
          <option value="custom">기타 (직접 입력)</option>
        </select>
      </label>}

      {isStaff && prayerMinutes === "custom" && <label className="field">
        <span>기도시간 직접 입력 (분)</span>
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={customMinutes} onChange={(event) => handleCustomMinutesChange(event.target.value)} placeholder="숫자만 입력해 주세요" required />
      </label>}

      <label className="field">
        <span>기도 횟수{isStaff && <em className="linkedNote">기도 시간과 연동돼요</em>}</span>
        <select className={isStaff ? "linked" : ""} value={prayerCount} onChange={(event) => handlePrayerCountChange(Number(event.target.value))} required>
          {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}회</option>)}
        </select>
      </label>

      <button className="submitButton" type="submit" disabled={submitting}>{submitting ? "기록 중..." : saved ? `${prayerCount}회 기도 기록 완료` : "기도 기록하기"}</button>
      {saved && <p className="successMessage" role="status" aria-live="polite">기도 {prayerCount}회가 잘 기록되었어요!</p>}
    </form>

    <section className="ranking" aria-labelledby="ranking-title">
      <h2 id="ranking-title">기도 나무를 만들어가는 사람들</h2>
      {ranking.length === 0 ? <p className="rankingEmpty">아직 순위에 오른 기도가 없어요.</p> : <>
        <ol className="rankingList">
          {rankingPageItems.map((entry, index) => <li key={`${entry.schoolGroup}-${entry.name}-${index}`} className={entry.rank <= 3 ? `rank-${entry.rank}` : undefined}>
            <span className="rankingRank">{entry.rank}</span>
            <span className="rankingName">{entry.name}<small>{entry.schoolGroup}</small></span>
            <span className="rankingCount">{entry.total.toLocaleString()}회</span>
          </li>)}
        </ol>
        {rankingPageCount > 1 && <div className="rankingPager">
          <button type="button" onClick={() => setRankingPage((page) => Math.max(0, page - 1))} disabled={rankingPage === 0}>이전</button>
          <span>{rankingPage + 1} / {rankingPageCount}</span>
          <button type="button" onClick={() => setRankingPage((page) => Math.min(rankingPageCount - 1, page + 1))} disabled={rankingPage >= rankingPageCount - 1}>다음</button>
        </div>}
      </>}
    </section>

    <p className="closing">기도가 쌓일수록 우리의 나무가 자라납니다.</p>

    {showAnnouncement && <AnnouncementModal onClose={() => setShowAnnouncement(false)} />}
    {showMyStatus && <MyStatusModal onClose={() => setShowMyStatus(false)} />}
    {dailyWarning && <DailyLimitModal
      schoolGroup={schoolGroup} name={studentName} date={dailyWarning.date}
      onClose={() => setDailyWarning(null)}
    />}
  </main>;
}
