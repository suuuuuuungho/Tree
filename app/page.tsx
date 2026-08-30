"use client";

import { useState } from "react";

const prayerTopics = [
  "가족을 위한 기도", "친구를 위한 기도", "학교를 위한 기도", "선생님을 위한 기도", "아픈 이웃을 위한 기도",
  "감사 기도", "회개 기도", "나라를 위한 기도", "교회를 위한 기도", "나의 꿈을 위한 기도",
];

export default function Home() {
  const [prayerCount, setPrayerCount] = useState(0);
  const totalPrayers = 10;
  const progress = (prayerCount / totalPrayers) * 100;
  const addPrayer = () => setPrayerCount((count) => Math.min(count + 1, totalPrayers));

  return <main>
    <header className="nav">
      <a className="brand" href="#top" aria-label="기도나무 처음으로">기도<span>나무</span></a>
      <nav aria-label="주요 메뉴"><a href="#tree">나의 기도</a><a href="#topics">기도 제목</a></nav>
      <a className="primary navCta" href="#tree">기도 시작하기</a>
    </header>

    <section className="hero" id="top">
      <p className="eyebrow">하루 한 번, 마음을 모으는 시간</p>
      <h1>열 번의 기도로<br />나무를 활짝 피워요</h1>
      <p className="heroCopy">기도할 때마다 꽃 한 송이가 피어납니다.<br />오늘의 마음을 차곡차곡 모아 기도나무를 완성해 보세요.</p>
      <a className="primary heroCta" href="#tree">나의 기도 기록하기</a>
    </section>

    <section className="treeSection" id="tree">
      <div className="treeCopy">
        <p className="eyebrow">나의 기도나무</p>
        <h2>{prayerCount} / {totalPrayers}회 기도했어요</h2>
        <p>기도를 마칠 때마다 꽃을 눌러 나무를 채워 주세요.</p>
        <div className="progressTrack" role="progressbar" aria-label="기도 진행률" aria-valuemin={0} aria-valuemax={totalPrayers} aria-valuenow={prayerCount}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="treeActions">
          <button className="primary" onClick={addPrayer} disabled={prayerCount === totalPrayers}>{prayerCount === totalPrayers ? "기도나무 완성!" : "기도 1회 기록"}</button>
          <button className="secondary" onClick={() => setPrayerCount(0)} disabled={prayerCount === 0}>처음부터</button>
        </div>
      </div>

      <div className="treeCard" aria-label={`꽃 ${prayerCount}송이가 핀 기도나무`}>
        <div className="cloud cloudOne" /><div className="cloud cloudTwo" />
        <div className="crown">
          {Array.from({ length: totalPrayers }, (_, index) => <button
            className={`flower ${index < prayerCount ? "bloomed" : ""}`} key={index}
            onClick={index === prayerCount ? addPrayer : undefined}
            aria-label={`${index + 1}번째 기도${index < prayerCount ? " 완료" : ""}`} disabled={index !== prayerCount}
          ><span>✿</span></button>)}
        </div>
        <div className="trunk" /><div className="grass" />
      </div>
    </section>

    <section className="topics" id="topics">
      <div className="sectionHead"><div><p className="eyebrow">무엇을 기도할까요?</p><h2>오늘의 기도 제목</h2></div><p>마음에 닿는 제목 하나를 골라 천천히 기도해 보세요.</p></div>
      <div className="topicGrid">{prayerTopics.map((topic, index) => <article className="topicCard" key={topic}><span>{String(index + 1).padStart(2, "0")}</span><h3>{topic}</h3></article>)}</div>
    </section>

    <section className="join"><p>작은 기도가 모여<br />큰 사랑이 됩니다.</p><a className="primary" href="#tree">오늘의 기도 시작하기</a></section>
    <footer><a className="brand" href="#top">기도<span>나무</span></a><p>매일 한 번, 사랑을 담아.</p><small>© 2026 기도나무</small></footer>
  </main>;
}
