import UploadPanel from "../components/UploadPanel";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 pl-2">
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight mb-2">Welcome to GramIQ</h1>
          <p className="text-slate-500 font-medium text-lg">Upload a crop photo for an instant AI-powered disease diagnosis.</p>
        </header>
        
        <UploadPanel />
      </div>
    </main>
  );
}
