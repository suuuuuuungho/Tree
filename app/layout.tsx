import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "기도나무 | 함께 채우는 기도",
  description: "하루의 기도를 기록하고 열 번의 기도로 나무를 함께 피워 보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
