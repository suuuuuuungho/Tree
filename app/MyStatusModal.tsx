"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type PrayerRecord = { id: string; date: string; prayerCount: number };
type Identity = { schoolGroup: string; name: string };
type Step = "identity" | "setup" | "login" | "calendar";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const SCHOOL_GROUPS = [
  "1-1반", "1-2반", "1-3반", "1-4반", "1-5반", "1-6반",
  "2-1반", "2-2반", "2-3반", "2-4반", "2-5반", "2-6반", "2-7반",
  "3-1반", "3-2반", "3-3반", "3-4반", "3-5반",
  "신입1반", "신입2반", "신입3반", "신입4반",
  "교사", "교역자",
];

export default function MyStatusModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<Step>("identity");
  const [schoolGroup, setSchoolGroup] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [identity, setIdentity] = useState<Identity | null>(null);
  const [records, setRecords] = useState<PrayerRecord[]>([]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editCounts, setEditCounts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const loadRecords = async () => {
    const response = await fetch("/api/me/records");
    if (response.status === 401) { setStep("identity"); return; }
    const data = await response.json() as { configured?: boolean; identity?: Identity; records?: PrayerRecord[] };
    if (data.identity) setIdentity(data.identity);
    setRecords(data.records ?? []);
  };

  const handleIdentitySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/me/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolGroup, name }),
      });
      if (!response.ok) { setError("확인에 실패했어요. 잠시 후 다시 시도해 주세요."); return; }
      const data = await response.json() as { exists?: boolean };
      setPassword("");
      setConfirmPassword("");
      setStep(data.exists ? "login" : "setup");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAuthSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (step === "setup" && password !== confirmPassword) {
      setError("비밀번호가 서로 달라요.");
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch("/api/me/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolGroup, name, password }),
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) { setError(data.error ?? "확인에 실패했어요."); return; }
      setIdentity({ schoolGroup, name });
      await loadRecords();
      setStep("calendar");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/me/logout", { method: "POST" });
    setIdentity(null);
    setRecords([]);
    setSchoolGroup("");
    setName("");
    setPassword("");
    setConfirmPassword("");
    setSelectedDate(null);
    setStep("identity");
  };

  const dailyTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const record of records) map.set(record.date, (map.get(record.date) ?? 0) + record.prayerCount);
    return map;
  }, [records]);

  const totalCount = useMemo(() => records.reduce((sum, record) => sum + record.prayerCount, 0), [records]);

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

  const selectedRecords = useMemo(() => records.filter((record) => record.date === selectedDate), [records, selectedDate]);

  const handleDayClick = (date: string) => {
    setActionError("");
    setSelectedDate((current) => current === date ? null : date);
  };

  const handleSaveRecord = async (record: PrayerRecord) => {
    setSavingId(record.id);
    setActionError("");
    try {
      const response = await fetch(`/api/me/records/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: record.date, prayerCount: editCounts[record.id] ?? record.prayerCount }),
      });
      if (!response.ok) { setActionError("저장에 실패했어요."); return; }
      await loadRecords();
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRecord = async (record: PrayerRecord) => {
    if (!window.confirm(`${record.date} · ${record.prayerCount}회 기록을 삭제할까요?`)) return;
    setDeletingId(record.id);
    setActionError("");
    try {
      const response = await fetch(`/api/me/records/${record.id}`, { method: "DELETE" });
      if (!response.ok) { setActionError("삭제에 실패했어요."); return; }
      await loadRecords();
    } finally {
      setDeletingId(null);
    }
  };

  return <div className="myStatusOverlay" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="myStatusSheet">
      <div className="myStatusHeader">
        <h2>내 기도 현황</h2>
        <button type="button" className="myStatusClose" onClick={onClose} aria-label="닫기">✕</button>
      </div>

      {(step === "identity") && <form className="myStatusForm" onSubmit={handleIdentitySubmit}>
        <p className="myStatusHint">학년 · 반과 이름을 입력해 주세요.</p>
        <label className="field">
          <span>학년 · 반</span>
          <select value={schoolGroup} onChange={(event) => setSchoolGroup(event.target.value)} required>
            <option value="" disabled>학년 · 반 선택</option>
            {SCHOOL_GROUPS.map((group) => <option key={group}>{group}</option>)}
          </select>
        </label>
        <label className="field">
          <span>이름</span>
          <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder="이름을 입력해 주세요" required />
        </label>
        {error && <p className="adminError">{error}</p>}
        <button className="submitButton" type="submit" disabled={submitting}>{submitting ? "확인 중..." : "다음"}</button>
      </form>}

      {(step === "setup" || step === "login") && <form className="myStatusForm" onSubmit={handleAuthSubmit}>
        <p className="myStatusHint">
          {step === "setup"
            ? <>처음이시네요! <strong>{schoolGroup} {name}</strong>님, 앞으로 사용하실 비밀번호를 새로 설정해 주세요.</>
            : <><strong>{schoolGroup} {name}</strong>님, 비밀번호를 입력해 주세요.</>}
        </p>
        <label className="field">
          <span>비밀번호</span>
          <input type="password" inputMode="numeric" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="숫자 4자리 이상" required autoFocus />
        </label>
        {step === "setup" && <label className="field">
          <span>비밀번호 확인</span>
          <input type="password" inputMode="numeric" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="비밀번호를 한 번 더 입력해 주세요" required />
        </label>}
        {error && <p className="adminError">{error}</p>}
        <button className="submitButton" type="submit" disabled={submitting}>{submitting ? "확인 중..." : step === "setup" ? "비밀번호 설정하기" : "확인"}</button>
        <button type="button" className="myStatusBack" onClick={() => { setStep("identity"); setError(""); }}>다시 입력하기</button>
      </form>}

      {step === "calendar" && identity && <div className="myStatusCalendarWrap">
        <div className="myStatusSummary">
          <span>{identity.schoolGroup} {identity.name}님</span>
          <strong>총 {totalCount.toLocaleString()}회</strong>
        </div>

        <div className="adminCalendarHeader">
          <button type="button" onClick={() => setCursor((current) => current.month === 0 ? { year: current.year - 1, month: 11 } : { year: current.year, month: current.month - 1 })}>이전</button>
          <h3>{cursor.year}년 {cursor.month + 1}월</h3>
          <button type="button" onClick={() => setCursor((current) => current.month === 11 ? { year: current.year + 1, month: 0 } : { year: current.year, month: current.month + 1 })}>다음</button>
        </div>

        <div className="adminCalendarGrid myStatusGrid">
          {WEEKDAYS.map((weekday) => <div key={weekday} className="adminCalendarWeekday">{weekday}</div>)}
          {calendarCells.map((cell, index) => {
            if (!cell) return <div key={`empty-${index}`} className="adminCalendarCell empty" />;
            const total = dailyTotals.get(cell.date);
            const isSelected = selectedDate === cell.date;
            return <button
              type="button" key={cell.date}
              className={`adminCalendarCell myStatusCell${total ? " hasData" : ""}${isSelected ? " selected" : ""}`}
              onClick={() => total && handleDayClick(cell.date)}
              disabled={!total}
            >
              <span className="adminCalendarDay">{cell.day}</span>
              {total ? <span className="adminCalendarTotal">{total}회</span> : <span className="adminCalendarEmpty">-</span>}
            </button>;
          })}
        </div>

        {actionError && <p className="adminError">{actionError}</p>}

        {selectedDate && <div className="myStatusDayDetail">
          <h4>{selectedDate}</h4>
          {selectedRecords.map((record) => <div className="myStatusRecordRow" key={record.id}>
            <select
              value={editCounts[record.id] ?? record.prayerCount}
              onChange={(event) => setEditCounts((prev) => ({ ...prev, [record.id]: Number(event.target.value) }))}
            >
              {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}회</option>)}
            </select>
            <div className="recordsActions">
              <button type="button" onClick={() => handleSaveRecord(record)} disabled={savingId === record.id}>{savingId === record.id ? "저장 중..." : "저장"}</button>
              <button type="button" className="danger" onClick={() => handleDeleteRecord(record)} disabled={deletingId === record.id}>{deletingId === record.id ? "삭제 중..." : "삭제"}</button>
            </div>
          </div>)}
        </div>}

        <button type="button" className="myStatusBack" onClick={handleLogout}>다른 이름으로 확인하기</button>
      </div>}
    </div>
  </div>;
}
