export default function ReportPage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-geist-sans)] flex flex-col gap-8">
      <header className="border-b pb-4">
        <h1 className="text-3xl font-bold">Validation Report</h1>
        <p className="text-gray-500 mt-2">Report ID: {params.id}</p>
      </header>
      
      <main className="flex flex-col gap-6">
        <section className="bg-red-50 p-6 rounded border border-red-200">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Failure Detected</h2>
          <p className="text-red-900">
            The firmware failed to detect an irregular heartbeat characteristic of Atrial Fibrillation (AF) for this virtual patient.
          </p>
        </section>

        <section className="p-6 rounded border">
          <h2 className="text-xl font-semibold mb-2">AI Analysis (DeepSeek-R1)</h2>
          <div className="bg-gray-100 p-4 rounded text-sm font-mono whitespace-pre-wrap">
            {"Loading reasoning from AI..."}
          </div>
        </section>
      </main>
    </div>
  );
}
