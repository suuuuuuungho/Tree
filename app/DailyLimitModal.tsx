"use client";

import { useEffect, useState } from "react";

type DailyRecord = { id: string; prayerCount: number };

type Props = {
  schoolGroup: string;
  name: string;
  date: string;
  onClose: () => void;
};

export default function DailyLimitModal({ schoolGroup, name, date, onClose }: Props) {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editCounts, setEditCounts] = useState<Record<string, number>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const loadDay = async () => {
    const response = await fetch(`/api/prayers/day?schoolGroup=${encodeURIComponent(schoolGroup)}&name=${encodeURIComponent(name)}&date=${date}`);
    const data = await response.json() as { records?: DailyRecord[] };
    setRecords(data.records ?? []);
  };

  useEffect(() => {
    document.body.style.overflow = "hidden";
    (async () => {
      await loadDay();
      setLoading(false);
    })();
    return () => { document.body.style.overflow = ""; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const existingTotal = records.reduce((sum, record) => sum + record.prayerCount, 0);

  const handleSaveRecord = async (record: DailyRecord) => {
    setSavingId(record.id);
    setActionError("");
    try {
      const response = await fetch(`/api/prayers/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolGroup, name, date, prayerCount: editCounts[record.id] ?? record.prayerCount }),
      });
      if (!response.ok) { setActionError("저장에 실패했어요."); return; }
      await loadDay();
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteRecord = async (record: DailyRecord) => {
    if (!window.confirm(`${record.prayerCount}회 기록을 삭제할까요?`)) return;
    setDeletingId(record.id);
    setActionError("");
    try {
      const response = await fetch(`/api/prayers/${record.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolGroup, name }),
      });
      if (!response.ok) { setActionError("삭제에 실패했어요."); return; }
      await loadDay();
    } finally {
      setDeletingId(null);
    }
  };

  return <div className="myStatusOverlay" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="myStatusSheet">
      <div className="myStatusHeader">
        <h2>오늘은 이미 기록하셨어요</h2>
        <button type="button" className="myStatusClose" onClick={onClose} aria-label="닫기">✕</button>
      </div>

      <p className="myStatusHint">
        {date}에 <strong>{schoolGroup} {name}</strong>님은 이미 <strong>{existingTotal}회</strong>를 기록하셨어요.
        하루에 한 번만 제출할 수 있어서 추가 제출은 안 돼요. 아래에서 오늘 기록을 수정하거나 삭제할 수 있어요.
      </p>

      {actionError && <p className="adminError">{actionError}</p>}

      {loading ? <p className="adminDetailLoading">불러오는 중...</p> : records.length === 0 ? <p className="adminDetailEmpty">오늘 기록이 없어요.</p> : <div className="myStatusDayDetail">
        {records.map((record) => <div className="myStatusRecordRow" key={record.id}>
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

      <button type="button" className="submitButton dailyLimitConfirm" onClick={onClose}>확인</button>
    </div>
  </div>;
}
