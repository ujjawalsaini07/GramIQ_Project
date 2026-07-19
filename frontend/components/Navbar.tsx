import Link from "next/link";

/**
 * Navbar — persistent top navigation linking all 4 views.
 * Props: none (renders on every page via layout.tsx)
 */
export default function Navbar() {
  return (
    <nav className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center gap-6">
      <Link href="/" className="text-gray-900 font-bold text-lg">
        🌿 Krishi Clinic Lite
      </Link>
      <div className="flex gap-4 ml-auto text-sm font-medium">
        <Link href="/" className="text-gray-600 hover:text-blue-600 transition-colors">
          Diagnose
        </Link>
        <Link href="/history" className="text-gray-600 hover:text-blue-600 transition-colors">
          History
        </Link>
        <Link href="/analytics" className="text-gray-600 hover:text-blue-600 transition-colors">
          Analytics
        </Link>
      </div>
    </nav>
  );
}
