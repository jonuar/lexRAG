import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LexRAG — Legal Document Intelligence",
  description: "Semantic search and Q&A over legal and trademark documents using RAG.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
