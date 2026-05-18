import UploadZone from "@/components/UploadZone";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">
          Ask your data anything
        </h1>
        <p className="text-gray-500 text-[15px] leading-relaxed">
          Upload a CSV and ask questions in plain English. Get answers as tables, charts, and SQL — no code required.
        </p>
      </div>
      <UploadZone />
    </main>
  );
}
