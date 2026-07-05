import { Wallet, Droplets, LineChart } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Wallet,
    title: "Connect and get play tokens",
    description:
      "Sign in with your wallet or email, then claim free simulated sUSD and sETH from the faucet — no purchase, ever.",
  },
  {
    number: "02",
    icon: Droplets,
    title: "Add liquidity or make a trade",
    description:
      "Deposit both tokens to become a liquidity provider, or swap one for the other and watch the price shift live, exactly like a real AMM.",
  },
  {
    number: "03",
    icon: LineChart,
    title: "Watch the math play out",
    description:
      "See your impermanent loss and fees earned update in real time, charted against what you'd have if you'd simply held your tokens.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-24">
      <div className="max-w-xl mb-14">
        <h2 className="font-display text-3xl font-semibold tracking-tight">
          Three steps, zero risk
        </h2>
        <p className="mt-3 text-ink-soft leading-relaxed">
          The pool runs on a real smart contract on a public test network —
          the mechanics are identical to a real AMM. Only the tokens
          themselves are fake.
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-8">
        {steps.map((step) => (
          <div key={step.number} className="relative">
            <span className="font-display text-5xl font-semibold text-primary-soft select-none">
              {step.number}
            </span>
            <div className="mt-3 w-10 h-10 rounded-xl bg-primary-soft text-primary-dark flex items-center justify-center">
              <step.icon size={18} strokeWidth={2.2} />
            </div>
            <h3 className="mt-4 font-display font-semibold text-lg">{step.title}</h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
