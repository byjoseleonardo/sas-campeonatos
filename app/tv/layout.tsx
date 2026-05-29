import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Llaves en vivo — TV",
};

export default function TvLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-secondary text-white">{children}</div>
  );
}
