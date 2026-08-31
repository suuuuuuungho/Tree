"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type DailyStat = { date: string; total: number; student: number; teacher: number };
type DayEntry = { schoolGroup: string; name: string; prayerCount: number };
type Entry = { id: string; schoolGroup: string; name: string; date: string; prayerCount: number };
type EditDraft = { schoolGroup: string; name: string; date: string; prayerCount: number };

function formatStat(total: number, participants: number) {
  return `${total.toLocaleString()}회 / ${participants.toLocaleString()}명`;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const STAFF_GROUPS = ["교사", "교역자"];

const STUDENT_CLASS_ORDER = [
  "1-1반", "1-2반", "1-3반", "1-4반", "1-5반", "1-6반",
  "2-1반", "2-2반", "2-3반", "2-4반", "2-5반", "2-6반", "2-7반",
  "3-1반", "3-2반", "3-3반", "3-4반", "3-5반",
  "신입1반", "신입2반", "신입3반", "신입4반",
];
const GRADE_ORDER = ["1학년", "2학년", "3학년", "신입"];
const ALL_GROUPS = [...STUDENT_CLASS_ORDER, "교사", "교역자"];

function gradeOf(schoolGroup: string) {
  if (schoolGroup.startsWith("1-")) return "1학년";
  if (schoolGroup.startsWith("2-")) return "2학년";
  if (schoolGroup.startsWith("3-")) return "3학년";
  if (schoolGroup.startsWith("신입")) return "신입";
  return null;
}

function shortDate(date: string) {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

type TabKey = "daily" | "trend" | "classes" | "records";
const TABS: { key: TabKey; label: string }[] = [
  { key: "daily", label: "일별 상세 내역" },
  { key: "trend", label: "일별 추이" },
  { key: "classes", label: "반별 현황" },
  { key: "records", label: "기록 수정" },
];

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("daily");

  const [daily, setDaily] = useState<DailyStat[]>([]);
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [dayEntries, setDayEntries] = useState<DayEntry[]>([]);
  const [dayLoading, setDayLoading] = useState(false);

  const [entries, setEntries] = useState<Entry[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<string, EditDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recordsError, setRecordsError] = useState("");

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

  const loadEntries = async () => {
    try {
      const response = await fetch("/api/admin/entries");
      if (response.status === 401) return;
      const data = await response.json() as { configured?: boolean; entries?: Entry[] };
      setEntries(data.entries ?? []);
    } catch {
      setEntries([]);
    }
  };

  useEffect(() => {
    loadStats().then((ok) => { if (ok) loadEntries(); }).finally(() => setChecking(false));
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
      await loadEntries();
    } finally {
      setSubmitting(false);
    }
  };

  const handleDayClick = async (date: string) => {
    if (selectedDate === date) {
      setSelectedDate(null);
      return;
    }
    setSelectedDate(date);
    setDayLoading(true);
    try {
      const response = await fetch(`/api/admin/day?date=${date}`);
      const data = await response.json() as { configured?: boolean; entries?: DayEntry[] };
      setDayEntries(data.entries ?? []);
    } catch {
      setDayEntries([]);
    } finally {
      setDayLoading(false);
    }
  };

  const getDraft = (record: Entry): EditDraft => drafts[record.id] ?? { schoolGroup: record.schoolGroup, name: record.name, date: record.date, prayerCount: record.prayerCount };

  const handleFieldChange = (record: Entry, patch: Partial<EditDraft>) => {
    setDrafts((prev) => ({ ...prev, [record.id]: { ...getDraft(record), ...patch } }));
    setRecordsError("");
  };

  const handleSaveRow = async (record: Entry) => {
    const draft = getDraft(record);
    setSavingId(record.id);
    setRecordsError("");
    try {
      const response = await fetch(`/api/admin/records/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        setRecordsError("저장에 실패했어요.");
        return;
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
      await Promise.all([loadEntries(), loadStats()]);
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (record: Entry) => {
    if (!window.confirm(`${record.date} · ${record.schoolGroup} · ${record.name} · ${record.prayerCount}회 기록을 삭제할까요?`)) return;
    setDeletingId(record.id);
    setRecordsError("");
    try {
      const response = await fetch(`/api/admin/records/${record.id}`, { method: "DELETE" });
      if (!response.ok) {
        setRecordsError("삭제에 실패했어요.");
        return;
      }
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
      await Promise.all([loadEntries(), loadStats()]);
    } finally {
      setDeletingId(null);
    }
  };

  const sortedRecords = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date) || a.schoolGroup.localeCompare(b.schoolGroup) || a.name.localeCompare(b.name)), [entries]);

  const studentEntries = useMemo(() => dayEntries.filter((entry) => !STAFF_GROUPS.includes(entry.schoolGroup)), [dayEntries]);
  const teacherEntries = useMemo(() => dayEntries.filter((entry) => STAFF_GROUPS.includes(entry.schoolGroup)), [dayEntries]);

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

  const maxDailyValue = useMemo(() => Math.max(1, ...daily.flatMap((day) => [day.student, day.teacher, day.total])), [daily]);

  const LINE_CHART_HEIGHT = 240;
  const LINE_CHART_PAD_TOP = 30;
  const LINE_CHART_PAD_BOTTOM = 32;
  const LINE_CHART_COL_WIDTH = 56;
  const lineChartWidth = Math.max(360, daily.length * LINE_CHART_COL_WIDTH);
  const lineX = (index: number) => daily.length > 1 ? (index / (daily.length - 1)) * (lineChartWidth - 56) + 28 : lineChartWidth / 2;
  const lineY = (value: number) => {
    const plotHeight = LINE_CHART_HEIGHT - LINE_CHART_PAD_TOP - LINE_CHART_PAD_BOTTOM;
    return LINE_CHART_PAD_TOP + plotHeight - (value / maxDailyValue) * plotHeight;
  };
  const studentLinePoints = daily.map((day, index) => `${lineX(index)},${lineY(day.student)}`).join(" ");
  const teacherLinePoints = daily.map((day, index) => `${lineX(index)},${lineY(day.teacher)}`).join(" ");
  const totalLinePoints = daily.map((day, index) => `${lineX(index)},${lineY(day.total)}`).join(" ");

  const classStats = useMemo(() => {
    const totals = new Map<string, number>();
    const participants = new Map<string, Set<string>>();
    for (const entry of entries) {
      if (STUDENT_CLASS_ORDER.includes(entry.schoolGroup)) {
        totals.set(entry.schoolGroup, (totals.get(entry.schoolGroup) ?? 0) + entry.prayerCount);
        if (!participants.has(entry.schoolGroup)) participants.set(entry.schoolGroup, new Set());
        participants.get(entry.schoolGroup)!.add(entry.name);
      }
    }
    return { totals, participants };
  }, [entries]);

  const gradeGroups = useMemo(() => GRADE_ORDER.map((grade) => {
    const classes = STUDENT_CLASS_ORDER.filter((cls) => gradeOf(cls) === grade).map((cls) => ({
      name: cls,
      total: classStats.totals.get(cls) ?? 0,
      participants: classStats.participants.get(cls)?.size ?? 0,
    }));
    const total = classes.reduce((sum, cls) => sum + cls.total, 0);
    const gradeParticipants = new Set(entries.filter((entry) => gradeOf(entry.schoolGroup) === grade).map((entry) => entry.name));
    return { name: grade, total, participants: gradeParticipants.size, classes };
  }), [classStats, entries]);

  const classTable = useMemo(() => {
    if (!selectedClass) return null;
    const rows = entries.filter((entry) => entry.schoolGroup === selectedClass);
    const dates = Array.from(new Set(rows.map((row) => row.date))).sort();
    const names = Array.from(new Set(rows.map((row) => row.name)));
    const matrix = new Map<string, Map<string, number>>();
    for (const name of names) matrix.set(name, new Map());
    for (const row of rows) {
      const nameMap = matrix.get(row.name)!;
      nameMap.set(row.date, (nameMap.get(row.date) ?? 0) + row.prayerCount);
    }
    return { dates, names, matrix };
  }, [entries, selectedClass]);

  if (checking) return <main className="adminMain"><p>불러오는 중...</p></main>;

  if (!authed) {
    return <main className="adminMain">
      <form className="adminLogin" onSubmit={handleLogin}>
        <h1>10.11.(주일) 올인 500명의 예배자_영혼의 때를 위하여</h1>
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
    <h1>10.11.(주일) 올인 500명의 예배자_영혼의 때를 위하여</h1>

    <div className="adminLayout">
      <nav className="adminSidebar">
        {TABS.map((tab) => <button
          key={tab.key} type="button"
          className={activeTab === tab.key ? "active" : ""}
          onClick={() => setActiveTab(tab.key)}
        >{tab.label}</button>)}
      </nav>

      <div className="adminContent">
        {activeTab === "daily" && <>
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
            <div className="adminCalendarScroll">
              <div className="adminCalendarGrid">
                {WEEKDAYS.map((weekday) => <div key={weekday} className="adminCalendarWeekday">{weekday}</div>)}
                {calendarCells.map((cell, index) => {
                  if (!cell) return <div key={`empty-${index}`} className="adminCalendarCell empty" />;
                  const stat = dailyMap.get(cell.date);
                  const isSelected = selectedDate === cell.date;
                  return <button
                    type="button" key={cell.date}
                    className={`adminCalendarCell${stat ? " hasData" : ""}${isSelected ? " selected" : ""}`}
                    onClick={() => stat && handleDayClick(cell.date)}
                    disabled={!stat}
                  >
                    <span className="adminCalendarDay">{cell.day}</span>
                    {stat ? <div className="adminCalendarStats">
                      <span className="adminCalendarTotal"><span className="adminCalendarTotalLabel">총 </span>{stat.total}회</span>
                      <div className="adminCalendarBreakdown">
                        <span>학생 {stat.student}회</span>
                        <span>교사 {stat.teacher}회</span>
                      </div>
                    </div> : <span className="adminCalendarEmpty">-</span>}
                  </button>;
                })}
              </div>
            </div>

            {selectedDate && <div className="adminDetail">
              <h3>{selectedDate} 상세 내역</h3>
              {dayLoading ? <p className="adminDetailLoading">불러오는 중...</p> : <div className="adminDetailGroups">
                <div className="adminDetailGroup">
                  <h4>학생 ({studentEntries.length}명)</h4>
                  {studentEntries.length === 0 ? <p className="adminDetailEmpty">기록 없음</p> : <ul>
                    {studentEntries.map((entry, index) => <li key={`${entry.name}-${index}`}>
                      <span className="adminDetailName">{entry.name}<small>{entry.schoolGroup}</small></span>
                      <span className="adminDetailCount">{entry.prayerCount}회</span>
                    </li>)}
                  </ul>}
                </div>
                <div className="adminDetailGroup">
                  <h4>교사 ({teacherEntries.length}명)</h4>
                  {teacherEntries.length === 0 ? <p className="adminDetailEmpty">기록 없음</p> : <ul>
                    {teacherEntries.map((entry, index) => <li key={`${entry.name}-${index}`}>
                      <span className="adminDetailName">{entry.name}<small>{entry.schoolGroup}</small></span>
                      <span className="adminDetailCount">{entry.prayerCount}회</span>
                    </li>)}
                  </ul>}
                </div>
              </div>}
            </div>}
          </section>
        </>}

        {activeTab === "trend" && <section className="adminTrend">
          <h2>일별 추이</h2>
          {daily.length === 0 ? <p className="adminDetailEmpty">아직 기록이 없어요.</p> : <>
            <div className="trendLegend">
              <span className="trendLegendItem"><i className="student" />학생</span>
              <span className="trendLegendItem"><i className="teacher" />교사</span>
              <span className="trendLegendItem"><i className="total" />총합</span>
            </div>

            <div className="trendChartScroll">
              <div className="trendChart">
                {daily.map((day) => <div className="trendCol" key={day.date}>
                  <div className="trendBars">
                    <div className="trendBarWrap">
                      <span className="trendValue">{day.student}</span>
                      <div className="trendBar student" style={{ height: `${(day.student / maxDailyValue) * 100}%` }} title={`학생 ${day.student}회`} />
                    </div>
                    <div className="trendBarWrap">
                      <span className="trendValue">{day.teacher}</span>
                      <div className="trendBar teacher" style={{ height: `${(day.teacher / maxDailyValue) * 100}%` }} title={`교사 ${day.teacher}회`} />
                    </div>
                  </div>
                  <span className="trendLabel">{shortDate(day.date)}</span>
                </div>)}
              </div>
            </div>

            <div className="trendChartScroll">
              <svg className="lineChart" width={lineChartWidth} height={LINE_CHART_HEIGHT} viewBox={`0 0 ${lineChartWidth} ${LINE_CHART_HEIGHT}`}>
                <line x1="0" y1={LINE_CHART_HEIGHT - LINE_CHART_PAD_BOTTOM} x2={lineChartWidth} y2={LINE_CHART_HEIGHT - LINE_CHART_PAD_BOTTOM} stroke="#d7d2ca" />
                <polyline points={studentLinePoints} fill="none" stroke="#356b1c" strokeWidth="3" />
                <polyline points={teacherLinePoints} fill="none" stroke="#701c9f" strokeWidth="3" />
                <polyline points={totalLinePoints} fill="none" stroke="#efa400" strokeWidth="4" />
                {daily.map((day, index) => <circle key={`student-${day.date}`} cx={lineX(index)} cy={lineY(day.student)} r="4" fill="#356b1c"><title>{`학생 ${day.student}회`}</title></circle>)}
                {daily.map((day, index) => <circle key={`teacher-${day.date}`} cx={lineX(index)} cy={lineY(day.teacher)} r="4" fill="#701c9f"><title>{`교사 ${day.teacher}회`}</title></circle>)}
                {daily.map((day, index) => <circle key={`total-${day.date}`} cx={lineX(index)} cy={lineY(day.total)} r="5" fill="#efa400" stroke="#fff" strokeWidth="1.5"><title>{`총합 ${day.total}회`}</title></circle>)}
                {daily.map((day, index) => <text key={`total-value-${day.date}`} x={lineX(index)} y={lineY(day.total) - 12} textAnchor="middle" fontSize="16" fontWeight="700" fill="#efa400">{day.total}</text>)}
                {daily.map((day, index) => <text key={`teacher-value-${day.date}`} x={lineX(index) + 18} y={lineY(day.teacher) + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#701c9f">{day.teacher}</text>)}
                {daily.map((day, index) => <text key={`student-value-${day.date}`} x={lineX(index) - 18} y={lineY(day.student) + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill="#356b1c">{day.student}</text>)}
                {daily.map((day, index) => <text key={`label-${day.date}`} x={lineX(index)} y={LINE_CHART_HEIGHT - 12} textAnchor="middle" fontSize="14" fill="#2d241f">{shortDate(day.date)}</text>)}
              </svg>
            </div>
          </>}
        </section>}

        {activeTab === "classes" && <section className="adminClasses">
          <h2>반별 현황</h2>
          <div className="classGrades">
            {gradeGroups.map((grade) => <div className="classGradeGroup" key={grade.name}>
              <button
                type="button" className={`classGradeHeader${selectedGrade === grade.name ? " open" : ""}`}
                onClick={() => setSelectedGrade((current) => current === grade.name ? null : grade.name)}
              >
                <span>{grade.name}</span><strong>{formatStat(grade.total, grade.participants)}</strong>
              </button>
              {selectedGrade === grade.name && <div className="classList">
                {grade.classes.map((cls) => <div className="classRowGroup" key={cls.name}>
                  <button
                    type="button"
                    className={`classRowHeader${selectedClass === cls.name ? " open" : ""}`}
                    onClick={() => setSelectedClass((current) => current === cls.name ? null : cls.name)}
                  >
                    <span>{cls.name}</span><strong>{formatStat(cls.total, cls.participants)}</strong>
                  </button>

                  {selectedClass === cls.name && classTable && <div className="classTableWrap">
                    {classTable.names.length === 0 ? <p className="adminDetailEmpty">기록 없음</p> : <div className="classTableScroll">
                      <table className="classTable">
                        <thead>
                          <tr><th>이름</th>{classTable.dates.map((date) => <th key={date}>{shortDate(date)}</th>)}</tr>
                        </thead>
                        <tbody>
                          {classTable.names.map((name) => <tr key={name}>
                            <td>{name}</td>
                            {classTable.dates.map((date) => <td key={date}>{classTable.matrix.get(name)?.get(date) ?? "-"}</td>)}
                          </tr>)}
                        </tbody>
                      </table>
                    </div>}
                  </div>}
                </div>)}
              </div>}
            </div>)}
          </div>
        </section>}

        {activeTab === "records" && <section className="adminRecords">
          <h2>기록 수정</h2>
          {recordsError && <p className="adminError">{recordsError}</p>}
          {sortedRecords.length === 0 ? <p className="adminDetailEmpty">아직 기록이 없어요.</p> : <div className="recordsTableScroll">
            <table className="recordsTable">
              <thead>
                <tr><th>날짜</th><th>학년 · 반</th><th>이름</th><th>횟수</th><th></th></tr>
              </thead>
              <tbody>
                {sortedRecords.map((record) => {
                  const draft = getDraft(record);
                  const isDirty = draft.date !== record.date || draft.schoolGroup !== record.schoolGroup || draft.name !== record.name || draft.prayerCount !== record.prayerCount;
                  return <tr key={record.id} className={isDirty ? "editing" : ""}>
                    <td data-label="날짜"><input type="date" value={draft.date} onChange={(event) => handleFieldChange(record, { date: event.target.value })} /></td>
                    <td data-label="학년 · 반">
                      <select value={draft.schoolGroup} onChange={(event) => handleFieldChange(record, { schoolGroup: event.target.value })}>
                        {ALL_GROUPS.map((group) => <option key={group} value={group}>{group}</option>)}
                      </select>
                    </td>
                    <td data-label="이름"><input type="text" value={draft.name} onChange={(event) => handleFieldChange(record, { name: event.target.value })} /></td>
                    <td data-label="횟수">
                      <select value={draft.prayerCount} onChange={(event) => handleFieldChange(record, { prayerCount: Number(event.target.value) })}>
                        {Array.from({ length: 10 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}회</option>)}
                      </select>
                    </td>
                    <td className="recordsActions" data-label="">
                      <button type="button" onClick={() => handleSaveRow(record)} disabled={savingId === record.id || !isDirty}>{savingId === record.id ? "저장 중..." : "저장"}</button>
                      <button type="button" className="danger" onClick={() => handleDelete(record)} disabled={deletingId === record.id}>{deletingId === record.id ? "삭제 중..." : "삭제"}</button>
                    </td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
        </section>}
      </div>
    </div>
  </main>;
}
