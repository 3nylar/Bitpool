import { Card } from "@/components/ui/Card";
import { Gauge, ShieldCheck, Waves, PlayCircle, BookOpen, GitCompare } from "lucide-react";

const features = [
  {
    icon: Waves,
    title: "Real constant-product math",
    description: "The exact x·y=k formula real AMMs use, including the 0.3% swap fee, on every trade.",
    color: "var(--primary)",
    soft: "var(--primary-soft)",
  },
  {
    icon: GitCompare,
    title: "Impermanent loss, visualized",
    description: "A live chart overlays your LP value against a simple 'held' baseline, so the gap is impossible to miss.",
    color: "var(--coral)",
    soft: "var(--coral-soft)",
  },
  {
    icon: PlayCircle,
    title: "One-click market simulation",
    description: "Trigger a burst of realistic trades with a single signature and watch the pool react.",
    color: "var(--teal)",
    soft: "var(--teal-soft)",
  },
  {
    icon: Gauge,
    title: "Live price impact preview",
    description: "See exactly what a trade will do to the price before you confirm it — no surprises.",
    color: "var(--amber)",
    soft: "var(--amber-soft)",
  },
  {
    icon: BookOpen,
    title: "Explanations built right in",
    description: "Every unfamiliar term has a plain-English tooltip the moment you encounter it.",
    color: "var(--success)",
    soft: "var(--success-soft)",
  },
  {
    icon: ShieldCheck,
    title: "Nothing real at stake",
    description: "Every token is a valueless simulator asset on a public test network. Experiment freely.",
    color: "var(--primary-dark)",
    soft: "var(--primary-soft)",
  },
];

export function Features() {
  return (
    <section id="features" className="bg-surface border-y border-line-soft">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="max-w-xl mb-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Built to teach, not just to demo
          </h2>
          <p className="mt-3 text-ink-soft leading-relaxed">
            Everything you need to build real intuition for how automated
            market makers behave.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {features.map((f) => (
            <Card key={f.title} className="p-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ background: f.soft, color: f.color }}
              >
                <f.icon size={18} strokeWidth={2.2} />
              </div>
              <h3 className="font-display font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-ink-soft leading-relaxed">{f.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
