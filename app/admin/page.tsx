"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type DailyStat = { date: string; total: number; student: number; teacher: number };
type DayEntry = { schoolGroup: string; name: string; prayerCount: number };
type Entry = { schoolGroup: string; name: string; date: string; prayerCount: number };

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const STAFF_GROUPS = ["교사", "교역자"];

const STUDENT_CLASS_ORDER = [
  "1-1반", "1-2반", "1-3반", "1-4반", "1-5반", "1-6반",
  "2-1반", "2-2반", "2-3반", "2-4반", "2-5반", "2-6반", "2-7반",
  "3-1반", "3-2반", "3-3반", "3-4반", "3-5반",
  "신입1반", "신입2반", "신입3반", "신입4반",
];
const GRADE_ORDER = ["1학년", "2학년", "3학년", "신입"];

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

type TabKey = "daily" | "trend" | "classes";
const TABS: { key: TabKey; label: string }[] = [
  { key: "daily", label: "일별 상세 내역" },
  { key: "trend", label: "일별 추이" },
  { key: "classes", label: "반별 현황" },
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

  const maxDailyValue = useMemo(() => Math.max(1, ...daily.flatMap((day) => [day.student, day.teacher])), [daily]);

  const classTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const entry of entries) {
      if (STUDENT_CLASS_ORDER.includes(entry.schoolGroup)) {
        map.set(entry.schoolGroup, (map.get(entry.schoolGroup) ?? 0) + entry.prayerCount);
      }
    }
    return map;
  }, [entries]);

  const gradeGroups = useMemo(() => GRADE_ORDER.map((grade) => {
    const classes = STUDENT_CLASS_ORDER.filter((cls) => gradeOf(cls) === grade).map((cls) => ({ name: cls, total: classTotals.get(cls) ?? 0 }));
    const total = classes.reduce((sum, cls) => sum + cls.total, 0);
    return { name: grade, total, classes };
  }), [classTotals]);

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
                    <span>총 {stat.total}회</span>
                    <span>학생 {stat.student}회</span>
                    <span>교사 {stat.teacher}회</span>
                  </div> : <span className="adminCalendarEmpty">-</span>}
                </button>;
              })}
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
            </div>
            <div className="trendChartScroll">
              <div className="trendChart">
                {daily.map((day) => <div className="trendCol" key={day.date}>
                  <div className="trendBars">
                    <div className="trendBar student" style={{ height: `${(day.student / maxDailyValue) * 100}%` }} title={`학생 ${day.student}회`} />
                    <div className="trendBar teacher" style={{ height: `${(day.teacher / maxDailyValue) * 100}%` }} title={`교사 ${day.teacher}회`} />
                  </div>
                  <span className="trendLabel">{shortDate(day.date)}</span>
                </div>)}
              </div>
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
                <span>{grade.name}</span><strong>{grade.total.toLocaleString()}회</strong>
              </button>
              {selectedGrade === grade.name && <div className="classList">
                {grade.classes.map((cls) => <div className="classRowGroup" key={cls.name}>
                  <button
                    type="button"
                    className={`classRowHeader${selectedClass === cls.name ? " open" : ""}`}
                    onClick={() => setSelectedClass((current) => current === cls.name ? null : cls.name)}
                  >
                    <span>{cls.name}</span><strong>{cls.total.toLocaleString()}회</strong>
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
      </div>
    </div>
  </main>;
}
