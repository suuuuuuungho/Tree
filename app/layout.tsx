import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const uiyeun = localFont({
  src: "../public/fonts/Uiyeun-Regular.woff",
  weight: "400",
  style: "normal",
  display: "swap",
  preload: true,
  fallback: ["Malgun Gothic", "Apple SD Gothic Neo", "sans-serif"],
  adjustFontFallback: false,
});

export const metadata: Metadata = {
  title: "기도나무 | 함께 채우는 기도",
  description: "매일의 기도를 기록하고 열 번의 기도로 나무를 함께 피워 보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body className={uiyeun.className}>{children}</body>
    </html>
  );
}
