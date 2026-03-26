"use client";

import { useState, useRef, useEffect } from "react";
import {
  ingestDocument,
  queryDocuments,
  getDocuments,
  deleteDocument,
  type Document,
  type QueryResult,
} from "../lib/api";

const SAMPLE_DOCS = [
  {
    title: "ApplePay – Trademark Class 36",
    category: "Financial Services",
    content:
      "ApplePay is a registered trademark by Apple Inc. under International Class 36, covering financial services, electronic funds transfer, digital payment processing, and mobile payment systems. The mark was first used in commerce in 2014 and is registered with the USPTO under registration number 4,801,471.",
  },
  {
    title: "USPTO Trademark Distinctiveness Guidelines",
    category: "Legal Guidelines",
    content:
      "The USPTO evaluates trademark distinctiveness along a spectrum: fanciful marks (invented words like Kodak or Xerox) receive the strongest protection. Arbitrary marks (common words applied in unrelated contexts, like Apple for computers) are also highly distinctive. Suggestive marks require imagination to connect to the product. Descriptive marks may only be protected with acquired distinctiveness. Generic terms are never registrable as trademarks.",
  },
  {
    title: "Likelihood of Confusion – Legal Standard",
    category: "IP Law",
    content:
      "Under the Lanham Act, trademark infringement occurs when a junior user adopts a mark that is likely to cause confusion with a senior user's registered mark. Courts apply the DuPont factors including: similarity of marks in appearance, sound, and meaning; relatedness of goods or services; strength of the senior mark; evidence of actual confusion; and the sophistication of consumers in the relevant market.",
  },
];

type Tab = "query" | "ingest" | "documents";
type Loading = "query" | "ingest" | "docs" | null;

export default function Home() {
  const [tab, setTab] = useState<Tab>("query");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState<Loading>(null);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [ingestForm, setIngestForm] = useState({ title: "", content: "", category: "General" });
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (tab === "documents") loadDocs();
  }, [tab]);

  async function loadDocs() {
    setLoading("docs");
    try {
      const d = await getDocuments();
      setDocs(d);
    } catch {
      setError("Could not load documents.");
    } finally {
      setLoading(null);
    }
  }

  async function handleQuery(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setLoading("query");
    setError(null);
    setResult(null);
    try {
      const r = await queryDocuments(question);
      setResult(r);
    } catch {
      setError("Query failed. Make sure the backend is running and documents are ingested.");
    } finally {
      setLoading(null);
    }
  }

  async function handleIngest(e: React.FormEvent) {
    e.preventDefault();
    if (!ingestForm.title || !ingestForm.content) return;
    setLoading("ingest");
    setError(null);
    try {
      const r = await ingestDocument(ingestForm.title, ingestForm.content, ingestForm.category);
      setSuccessMsg(`Document ingested — ${r.chunks_stored} chunks stored (ID: ${r.doc_id})`);
      setIngestForm({ title: "", content: "", category: "General" });
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      setError("Ingestion failed. Check your backend connection.");
    } finally {
      setLoading(null);
    }
  }

  async function handleSampleIngest() {
    setLoading("ingest");
    setError(null);
    try {
      for (const doc of SAMPLE_DOCS) {
        await ingestDocument(doc.title, doc.content, doc.category);
      }
      setSuccessMsg(`${SAMPLE_DOCS.length} sample documents ingested successfully.`);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch {
      setError("Sample ingestion failed.");
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(doc_id: string) {
    try {
      await deleteDocument(doc_id);
      setDocs((prev) => prev.filter((d) => d.doc_id !== doc_id));
    } catch {
      setError("Could not delete document.");
    }
  }

  return (
    <main style={styles.main}>
      {/* Header */}
      <header style={styles.header} className="animate-fade-up">
        <div style={styles.headerInner}>
          <div>
            <div style={styles.wordmark}>
              <span style={styles.wordmarkLex}>Lex</span>
              <span style={styles.wordmarkRag}>RAG</span>
            </div>
            <p style={styles.tagline}>Legal Document Intelligence</p>
          </div>
          <div style={styles.badge}>RAG · ChromaDB · Flask</div>
        </div>
        <div style={styles.divider} />
      </header>

      {/* Tab nav */}
      <nav style={styles.nav} className="animate-fade-up-delay-1">
        {(["query", "ingest", "documents"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setError(null); setResult(null); }}
            style={{
              ...styles.tabBtn,
              ...(tab === t ? styles.tabBtnActive : {}),
            }}
          >
            {t === "query" && "↗ Query"}
            {t === "ingest" && "+ Ingest"}
            {t === "documents" && "≡ Documents"}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div style={styles.content} className="animate-fade-up-delay-2">

        {/* ── QUERY TAB ── */}
        {tab === "query" && (
          <div style={styles.card}>
            <p style={styles.cardHint}>
              Ask a natural language question about your ingested legal documents.
            </p>
            <form onSubmit={handleQuery} style={styles.form}>
              <div style={styles.inputRow}>
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="e.g. What is the likelihood of confusion standard?"
                  style={styles.input}
                  disabled={loading === "query"}
                />
                <button
                  type="submit"
                  style={{
                    ...styles.btn,
                    ...(loading === "query" ? styles.btnDisabled : {}),
                  }}
                  disabled={loading === "query"}
                >
                  {loading === "query" ? <Spinner /> : "Search"}
                </button>
              </div>
            </form>

            {error && <div style={styles.error}>{error}</div>}

            {result && (
              <div style={styles.resultBlock} className="animate-fade-up">
                <div style={styles.resultLabel}>Answer</div>
                <p style={styles.resultAnswer}>{result.answer}</p>

                {result.sources.length > 0 && (
                  <>
                    <div style={{ ...styles.resultLabel, marginTop: "1.5rem" }}>
                      Sources · {result.context_used} chunks retrieved
                    </div>
                    <div style={styles.sourceList}>
                      {result.sources.map((s, i) => (
                        <div key={i} style={styles.sourceCard}>
                          <div style={styles.sourceHeader}>
                            <span style={styles.sourceTitle}>{s.title}</span>
                            <span style={styles.sourceScore}>
                              {(s.relevance_score * 100).toFixed(0)}% match
                            </span>
                          </div>
                          <p style={styles.sourceExcerpt}>{s.excerpt}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── INGEST TAB ── */}
        {tab === "ingest" && (
          <div style={styles.card}>
            <p style={styles.cardHint}>
              Add legal documents to the knowledge base. They will be chunked, embedded, and stored for semantic search.
            </p>

            <button
              onClick={handleSampleIngest}
              style={{ ...styles.btnOutline, marginBottom: "1.5rem" }}
              disabled={loading === "ingest"}
            >
              {loading === "ingest" ? <Spinner /> : "↓ Load sample trademark documents"}
            </button>

            <div style={styles.divider} />

            <form onSubmit={handleIngest} style={{ ...styles.form, marginTop: "1.5rem" }}>
              <label style={styles.label}>Document Title</label>
              <input
                value={ingestForm.title}
                onChange={(e) => setIngestForm({ ...ingestForm, title: e.target.value })}
                placeholder="e.g. Nike Trademark – Class 25 Filing"
                style={styles.input}
                required
              />

              <label style={{ ...styles.label, marginTop: "1rem" }}>Category</label>
              <select
                value={ingestForm.category}
                onChange={(e) => setIngestForm({ ...ingestForm, category: e.target.value })}
                style={styles.select}
              >
                {["General", "IP Law", "Financial Services", "Legal Guidelines", "Case Law", "Regulations"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <label style={{ ...styles.label, marginTop: "1rem" }}>Document Content</label>
              <textarea
                ref={textareaRef}
                value={ingestForm.content}
                onChange={(e) => setIngestForm({ ...ingestForm, content: e.target.value })}
                placeholder="Paste the full document text here..."
                style={styles.textarea}
                rows={8}
                required
              />

              {successMsg && <div style={styles.success}>{successMsg}</div>}
              {error && <div style={styles.error}>{error}</div>}

              <button
                type="submit"
                style={{ ...styles.btn, marginTop: "1rem", width: "100%" }}
                disabled={loading === "ingest"}
              >
                {loading === "ingest" ? <Spinner /> : "Ingest Document"}
              </button>
            </form>
          </div>
        )}

        {/* ── DOCUMENTS TAB ── */}
        {tab === "documents" && (
          <div style={styles.card}>
            <div style={styles.docsHeader}>
              <p style={styles.cardHint}>All documents currently in the vector store.</p>
              <button onClick={loadDocs} style={styles.btnGhost} disabled={loading === "docs"}>
                {loading === "docs" ? <Spinner /> : "↺ Refresh"}
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}

            {docs.length === 0 && loading !== "docs" && (
              <div style={styles.emptyState}>
                No documents ingested yet.{" "}
                <button onClick={() => setTab("ingest")} style={styles.inlineLink}>
                  Add one →
                </button>
              </div>
            )}

            {docs.map((doc) => (
              <div key={doc.doc_id} style={styles.docRow}>
                <div>
                  <div style={styles.docTitle}>{doc.title}</div>
                  <div style={styles.docMeta}>
                    <span style={styles.docCategory}>{doc.category}</span>
                    <span style={styles.docId}>#{doc.doc_id}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(doc.doc_id)}
                  style={styles.btnDanger}
                  title="Delete document"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <span>LexRAG</span>
        <span style={{ color: "var(--text-muted)" }}>·</span>
        <span>sentence-transformers · ChromaDB · Flask · Next.js</span>
        <span style={{ color: "var(--text-muted)" }}>·</span>
        <a
          href="https://github.com/jonuar/lexrag"
          target="_blank"
          rel="noreferrer"
          style={styles.footerLink}
        >
          GitHub ↗
        </a>
      </footer>
    </main>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-flex", gap: 3, alignItems: "center" }}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          style={{
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "currentColor",
            animation: `pulse-dot 1.2s ${i * 0.2}s ease-in-out infinite`,
          }}
        />
      ))}
    </span>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "3rem 1.5rem 6rem",
    minHeight: "100vh",
  },
  header: { marginBottom: "2rem" },
  headerInner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: "1.25rem",
  },
  wordmark: { display: "flex", alignItems: "baseline", gap: 2, marginBottom: "0.25rem" },
  wordmarkLex: {
    fontFamily: "var(--font-serif)",
    fontSize: "2.2rem",
    color: "var(--text-primary)",
    letterSpacing: "-0.02em",
  },
  wordmarkRag: {
    fontFamily: "var(--font-mono)",
    fontSize: "1.1rem",
    color: "var(--accent)",
    letterSpacing: "0.08em",
    fontWeight: 500,
  },
  tagline: {
    fontFamily: "var(--font-sans)",
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
  },
  badge: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--accent)",
    border: "1px solid rgba(201,169,110,0.3)",
    borderRadius: 2,
    padding: "0.3rem 0.6rem",
    letterSpacing: "0.05em",
  },
  divider: {
    height: 1,
    background: "var(--border)",
  },
  nav: {
    display: "flex",
    gap: "0.25rem",
    marginBottom: "1.5rem",
  },
  tabBtn: {
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    padding: "0.45rem 1rem",
    cursor: "pointer",
    borderRadius: "var(--radius)",
    letterSpacing: "0.04em",
    transition: "all 0.15s ease",
  },
  tabBtnActive: {
    color: "var(--accent)",
    borderColor: "rgba(201,169,110,0.3)",
    background: "var(--accent-glow)",
  },
  content: { flex: 1 },
  card: {
    background: "var(--bg-card)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "1.75rem",
  },
  cardHint: {
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    marginBottom: "1.25rem",
    lineHeight: 1.6,
  },
  form: { display: "flex", flexDirection: "column" },
  inputRow: { display: "flex", gap: "0.5rem" },
  input: {
    flex: 1,
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
    fontSize: "0.88rem",
    padding: "0.65rem 0.9rem",
    outline: "none",
    transition: "border-color 0.15s",
  },
  select: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-sans)",
    fontSize: "0.88rem",
    padding: "0.65rem 0.9rem",
    outline: "none",
  },
  textarea: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    color: "var(--text-primary)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    padding: "0.75rem 0.9rem",
    outline: "none",
    resize: "vertical",
    lineHeight: 1.6,
  },
  label: {
    fontSize: "0.72rem",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: "0.4rem",
    display: "block",
  },
  btn: {
    background: "var(--accent)",
    color: "#0a0a0a",
    border: "none",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.82rem",
    fontWeight: 500,
    padding: "0.65rem 1.25rem",
    cursor: "pointer",
    letterSpacing: "0.04em",
    transition: "opacity 0.15s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  btnDisabled: { opacity: 0.5, cursor: "not-allowed" },
  btnOutline: {
    background: "transparent",
    color: "var(--text-secondary)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    padding: "0.55rem 1rem",
    cursor: "pointer",
    letterSpacing: "0.04em",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
  },
  btnGhost: {
    background: "transparent",
    border: "none",
    color: "var(--text-secondary)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    cursor: "pointer",
    padding: "0.3rem 0.6rem",
  },
  btnDanger: {
    background: "transparent",
    border: "1px solid transparent",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "0.8rem",
    padding: "0.3rem 0.5rem",
    borderRadius: "var(--radius)",
    transition: "all 0.15s",
    flexShrink: 0,
  },
  resultBlock: {
    marginTop: "1.5rem",
    borderTop: "1px solid var(--border)",
    paddingTop: "1.25rem",
  },
  resultLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    color: "var(--text-muted)",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    marginBottom: "0.6rem",
  },
  resultAnswer: {
    fontSize: "0.92rem",
    color: "var(--text-primary)",
    lineHeight: 1.75,
    fontFamily: "var(--font-sans)",
    fontWeight: 300,
  },
  sourceList: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  sourceCard: {
    background: "var(--bg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius)",
    padding: "0.85rem 1rem",
  },
  sourceHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "0.4rem",
  },
  sourceTitle: {
    fontFamily: "var(--font-sans)",
    fontSize: "0.82rem",
    color: "var(--text-primary)",
    fontWeight: 500,
  },
  sourceScore: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--accent)",
  },
  sourceExcerpt: {
    fontSize: "0.78rem",
    color: "var(--text-secondary)",
    lineHeight: 1.6,
    fontFamily: "var(--font-mono)",
  },
  docsHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "1rem",
  },
  docRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0.85rem 0",
    borderBottom: "1px solid var(--border)",
    gap: "1rem",
  },
  docTitle: {
    fontSize: "0.88rem",
    color: "var(--text-primary)",
    fontWeight: 400,
    marginBottom: "0.25rem",
  },
  docMeta: { display: "flex", gap: "0.75rem", alignItems: "center" },
  docCategory: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    color: "var(--accent)",
    letterSpacing: "0.06em",
  },
  docId: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.68rem",
    color: "var(--text-muted)",
  },
  error: {
    marginTop: "1rem",
    padding: "0.75rem 1rem",
    background: "rgba(192,57,43,0.08)",
    border: "1px solid rgba(192,57,43,0.3)",
    borderRadius: "var(--radius)",
    color: "#e74c3c",
    fontSize: "0.82rem",
    fontFamily: "var(--font-mono)",
  },
  success: {
    marginTop: "1rem",
    padding: "0.75rem 1rem",
    background: "rgba(39,174,96,0.08)",
    border: "1px solid rgba(39,174,96,0.25)",
    borderRadius: "var(--radius)",
    color: "#2ecc71",
    fontSize: "0.82rem",
    fontFamily: "var(--font-mono)",
  },
  emptyState: {
    textAlign: "center",
    padding: "3rem 0",
    color: "var(--text-secondary)",
    fontSize: "0.85rem",
    fontFamily: "var(--font-mono)",
  },
  inlineLink: {
    background: "none",
    border: "none",
    color: "var(--accent)",
    cursor: "pointer",
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    textDecoration: "underline",
  },
  footer: {
    marginTop: "4rem",
    display: "flex",
    gap: "0.75rem",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--text-secondary)",
    letterSpacing: "0.06em",
  },
  footerLink: { color: "var(--accent)", textDecoration: "none" },
};
