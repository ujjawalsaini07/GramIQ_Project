import UploadPanel from "../components/UploadPanel";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Krishi Clinic Lite</h1>
          <p className="text-gray-600 mt-2">Upload a crop photo for an AI-powered disease diagnosis.</p>
        </header>
        
        <UploadPanel />
      </div>
    </main>
  );
}
