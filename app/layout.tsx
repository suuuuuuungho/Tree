import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "기도나무 | 함께 채우는 기도",
  description: "매일의 기도를 기록하고 열 번의 기도로 나무를 함께 피워 보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Poor+Story&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  );
}
