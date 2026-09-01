"use client";

import { useEffect, useState } from "react";

type DayStatus = { date: string; total: number };

type Props = {
  schoolGroup: string;
  name: string;
  minDate: string;
  onSelectDate: (date: string) => void;
  onClose: () => void;
};

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function heatLevel(total: number) {
  if (!total) return 0;
  if (total <= 2) return 1;
  if (total <= 4) return 2;
  if (total <= 7) return 3;
  return 4;
}

function buildDateRange(minDate: string, days: number) {
  const [y, m, d] = minDate.split("-").map(Number);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(y, m - 1, d + index);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  });
}

export default function RecordCalendarModal({ schoolGroup, name, minDate, onSelectDate, onClose }: Props) {
  const [days, setDays] = useState<DayStatus[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = buildDateRange(minDate, 7);
  const maxDate = dateRange[dateRange.length - 1];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    (async () => {
      const response = await fetch(`/api/prayers/range?schoolGroup=${encodeURIComponent(schoolGroup)}&name=${encodeURIComponent(name)}&start=${minDate}&end=${maxDate}`);
      const data = await response.json() as { days?: DayStatus[] };
      setDays(data.days ?? []);
      setLoading(false);
    })();
    return () => { document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalsByDate = new Map(days.map((day) => [day.date, day.total]));

  return <div className="myStatusOverlay" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="myStatusSheet">
      <div className="myStatusHeader">
        <h2>다른 날짜 기록하기</h2>
        <button type="button" className="myStatusClose" onClick={onClose} aria-label="닫기">✕</button>
      </div>

      <p className="myStatusHint">최근 7일 중 날짜를 선택하면 그 날짜로 기도를 기록할 수 있어요.</p>

      {loading ? <p className="adminDetailLoading">불러오는 중...</p> : <div className="dateHistoryGrid">
        {dateRange.map((date) => {
          const total = totalsByDate.get(date) ?? 0;
          const [y, m, d] = date.split("-").map(Number);
          const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
          return <button
            type="button" key={date}
            className={`dateHistoryCell heat-${heatLevel(total)}`}
            onClick={() => onSelectDate(date)}
          >
            <span className="dateHistoryWeekday">{weekday}</span>
            <span className="dateHistoryDay">{d}</span>
            {total > 0 ? <span className="dateHistoryCount">{total}회</span> : <span className="dateHistoryEmpty">-</span>}
          </button>;
        })}
      </div>}
    </div>
  </div>;
}
