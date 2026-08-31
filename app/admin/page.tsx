"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type DailyStat = { date: string; total: number; student: number; teacher: number };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const loadStats = async () => {
    try {
      const response = await fetch("/api/admin/stats");
      if (response.status === 401) {
        setAuthed(false);
        return false;
      }
      const data = await response.json() as { configured?: boolean; daily?: DailyStat[] };
      setDaily(data.daily ?? []);
      setAuthed(true);
      return true;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    loadStats().finally(() => setChecking(false));
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError("비밀번호가 올바르지 않아요.");
        return;
      }
      setPassword("");
      await loadStats();
    } finally {
      setSubmitting(false);
    }
  };

  const totals = useMemo(() => daily.reduce((acc, day) => ({
    total: acc.total + day.total,
    student: acc.student + day.student,
    teacher: acc.teacher + day.teacher,
  }), { total: 0, student: 0, teacher: 0 }), [daily]);

  const dailyMap = useMemo(() => new Map(daily.map((day) => [day.date, day])), [daily]);

  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
    const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
    const cells: ({ date: string; day: number } | null)[] = Array.from({ length: firstWeekday }, () => null);
    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(cursor.month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      cells.push({ date: `${cursor.year}-${mm}-${dd}`, day });
    }
    return cells;
  }, [cursor]);

  if (checking) return <main className="adminMain"><p>불러오는 중...</p></main>;

  if (!authed) {
    return <main className="adminMain">
      <form className="adminLogin" onSubmit={handleLogin}>
        <h1>관리자 페이지</h1>
        <label className="field">
          <span>비밀번호</span>
          <input type="password" inputMode="numeric" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="비밀번호를 입력해 주세요" required autoFocus />
        </label>
        {error && <p className="adminError">{error}</p>}
        <button className="submitButton" type="submit" disabled={submitting}>{submitting ? "확인 중..." : "로그인"}</button>
      </form>
    </main>;
  }

  return <main className="adminMain">
    <h1>관리자 페이지</h1>

    <section className="adminSummary">
      <div className="adminStat"><span>전체 누적</span><strong>{totals.total.toLocaleString()}회</strong></div>
      <div className="adminStat"><span>학생</span><strong>{totals.student.toLocaleString()}회</strong></div>
      <div className="adminStat"><span>교사</span><strong>{totals.teacher.toLocaleString()}회</strong></div>
    </section>

    <section className="adminCalendar">
      <div className="adminCalendarHeader">
        <button type="button" onClick={() => setCursor((current) => current.month === 0 ? { year: current.year - 1, month: 11 } : { year: current.year, month: current.month - 1 })}>이전</button>
        <h2>{cursor.year}년 {cursor.month + 1}월</h2>
        <button type="button" onClick={() => setCursor((current) => current.month === 11 ? { year: current.year + 1, month: 0 } : { year: current.year, month: current.month + 1 })}>다음</button>
      </div>
      <div className="adminCalendarGrid">
        {WEEKDAYS.map((weekday) => <div key={weekday} className="adminCalendarWeekday">{weekday}</div>)}
        {calendarCells.map((cell, index) => {
          if (!cell) return <div key={`empty-${index}`} className="adminCalendarCell empty" />;
          const stat = dailyMap.get(cell.date);
          return <div key={cell.date} className="adminCalendarCell">
            <span className="adminCalendarDay">{cell.day}</span>
            {stat ? <div className="adminCalendarStats">
              <span>총 {stat.total}회</span>
              <span>학생 {stat.student}회</span>
              <span>교사 {stat.teacher}회</span>
            </div> : <span className="adminCalendarEmpty">-</span>}
          </div>;
        })}
      </div>
    </section>
  </main>;
}
