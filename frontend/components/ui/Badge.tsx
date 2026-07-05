import { clsx } from "clsx";

type BadgeTone = "neutral" | "success" | "danger" | "amber" | "primary" | "teal" | "coral";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-canvas-alt text-ink-soft border-line",
  success: "bg-success-soft text-success border-transparent",
  danger: "bg-danger-soft text-danger border-transparent",
  amber: "bg-amber-soft text-amber border-transparent",
  primary: "bg-primary-soft text-primary-dark border-transparent",
  teal: "bg-teal-soft text-teal border-transparent",
  coral: "bg-coral-soft text-coral border-transparent",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
