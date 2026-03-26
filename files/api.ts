const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface Source {
  title: string;
  doc_id: string;
  relevance_score: number;
  excerpt: string;
}

export interface QueryResult {
  answer: string;
  sources: Source[];
  context_used: number;
}

export interface Document {
  doc_id: string;
  title: string;
  category: string;
}

export async function ingestDocument(
  title: string,
  content: string,
  category: string
): Promise<{ success: boolean; chunks_stored: number; doc_id: string }> {
  const res = await fetch(`${BASE_URL}/api/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, content, category }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function queryDocuments(question: string): Promise<QueryResult> {
  const res = await fetch(`${BASE_URL}/api/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, n_results: 5 }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDocuments(): Promise<Document[]> {
  const res = await fetch(`${BASE_URL}/api/documents`);
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return data.documents;
}

export async function deleteDocument(doc_id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/documents/${doc_id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await res.text());
}
