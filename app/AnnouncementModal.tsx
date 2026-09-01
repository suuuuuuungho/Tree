"use client";

import { useState } from "react";

const DISMISS_KEY = "prayer-tree-announcement-dismissed-date";

function todayKey() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function shouldShowAnnouncement() {
  try {
    return window.localStorage.getItem(DISMISS_KEY) !== todayKey();
  } catch {
    return true;
  }
}

export default function AnnouncementModal({ onClose }: { onClose: () => void }) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      try {
        window.localStorage.setItem(DISMISS_KEY, todayKey());
      } catch {
        // localStorage unavailable -- the announcement will just show again next visit.
      }
    }
    onClose();
  };

  return <div className="myStatusOverlay" role="dialog" aria-modal="true" onClick={(event) => { if (event.target === event.currentTarget) handleClose(); }}>
    <div className="myStatusSheet">
      <div className="myStatusHeader">
        <h2>[공지] 기도 기록 방식 안내</h2>
        <button type="button" className="myStatusClose" onClick={handleClose} aria-label="닫기">✕</button>
      </div>

      <ul className="announcementList">
        <li><strong>하루에 한 번만</strong> 기도 기록을 제출할 수 있어요. 오늘 이미 기록하셨다면 다시 제출은 안 되고, 대신 오늘 기록을 확인해서 수정하거나 삭제할 수 있어요.</li>
        <li>제출 가능한 날짜가 <strong>최근 7일</strong>로 제한돼요. 그보다 이전 날짜는 선택할 수 없어요.</li>
      </ul>

      <label className="announcementCheck">
        <input type="checkbox" checked={dontShowAgain} onChange={(event) => setDontShowAgain(event.target.checked)} />
        <span>오늘 하루 다시 보지 않기</span>
      </label>

      <button type="button" className="submitButton" onClick={handleClose}>확인했어요</button>
    </div>
  </div>;
}
