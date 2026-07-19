import Link from "next/link";
import { Sprout } from "lucide-react";

/**
 * Navbar — persistent top navigation linking all 4 views.
 * Props: none (renders on every page via layout.tsx)
 */
export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200 px-4 md:px-8 py-4 flex items-center gap-6 shadow-sm">
      <Link href="/" className="flex items-center gap-2 text-emerald-700 font-extrabold text-xl tracking-tight transition-transform hover:scale-105">
        <Sprout className="w-6 h-6" />
        Krishi Clinic Lite
      </Link>
      <div className="flex gap-6 ml-auto text-sm font-semibold tracking-wide">
        <Link href="/" className="text-slate-500 hover:text-emerald-600 transition-colors">
          Diagnose
        </Link>
        <Link href="/history" className="text-slate-500 hover:text-emerald-600 transition-colors">
          History
        </Link>
        <Link href="/analytics" className="text-slate-500 hover:text-emerald-600 transition-colors">
          Analytics
        </Link>
      </div>
    </nav>
  );
}
