import UploadZone from "@/components/UploadZone";

const EXAMPLES = [
  "What were total sales by month?",
  "Show the top 10 customers by revenue.",
  "Which category has the highest average margin?",
];

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16 bg-[#f8f9fa]">
      <div className="max-w-lg w-full text-center mb-10">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-medium mb-5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
          No SQL required
        </div>
        <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-4">
          Ask your data anything
        </h1>
        <p className="text-gray-500 text-[15px] leading-relaxed mb-7">
          Upload a CSV. Ask questions in plain English. Get answers as tables, charts, and SQL.
        </p>

        {/* Example questions */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {EXAMPLES.map((q) => (
            <span key={q} className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500">
              &ldquo;{q}&rdquo;
            </span>
          ))}
        </div>
      </div>

      <UploadZone />

      <p className="mt-8 text-xs text-gray-400">CSV files only · Max 50 MB · No account needed</p>
    </main>
  );
}
