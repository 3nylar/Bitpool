import { ShieldCheck } from "lucide-react";

export function EducationalBanner() {
  return (
    <div className="bg-primary text-white text-xs md:text-sm">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-2 flex items-center justify-center gap-2 text-center">
        <ShieldCheck size={14} className="flex-shrink-0" />
        <span>
          Educational simulator — every token here is valueless. No real
          funds are ever involved.
        </span>
      </div>
    </div>
  );
}
