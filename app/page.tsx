import Link from "next/link";
import UploadZone from "@/components/UploadZone";

const EXAMPLES = [
  "What's our total revenue by month?",
  "Which segment has the highest churn rate?",
  "Show burn rate and runway trend.",
  "Top 10 customers by LTV last quarter.",
];

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    label: "Finance-aware",
    desc: "Understands revenue, margins, CAC, churn, ARR, and 14 more metrics",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
    label: "Analyst output",
    desc: "Explains results like a CFO: key number, drivers, and what to ask next",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    label: "Safe by default",
    desc: "Read-only queries, row limits, and no data leaving your session",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Nav */}
      <nav className="border-b border-slate-200 bg-white px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
          </div>
          <span className="text-sm font-semibold text-slate-800 tracking-tight">DataChat</span>
        </div>
        <Link
          href="/workspace"
          className="text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
          Open workspace →
        </Link>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full text-center mb-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Finance analytics · No SQL required
          </div>

          {/* Headline */}
          <h1 className="text-[2.6rem] font-bold text-slate-900 tracking-tight leading-[1.15] mb-4">
            Ask your financial data{" "}
            <span className="text-blue-600">anything</span>
          </h1>

          {/* Subhead */}
          <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-md mx-auto">
            Upload a CSV. Ask in plain English. Get analyst-quality answers with charts, SQL, and follow-up questions.
          </p>

          {/* Example pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {EXAMPLES.map((q) => (
              <span
                key={q}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm"
              >
                &ldquo;{q}&rdquo;
              </span>
            ))}
          </div>
        </div>

        <UploadZone />

        <p className="mt-6 text-xs text-slate-400">CSV files only · Max 50 MB · No account needed</p>

        {/* Feature strip */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex flex-col items-center text-center gap-2 px-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1">
                {f.icon}
              </div>
              <p className="text-sm font-semibold text-slate-700">{f.label}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
