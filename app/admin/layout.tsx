import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "관리자 페이지 | 기도나무",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
