const faqs = [
  {
    q: "Is any real money or cryptocurrency involved?",
    a: "No. Every token in Bitpool — sUSD and sETH — is a free, valueless token created purely for this simulator. They cannot be bought, sold, or exchanged for anything of value.",
  },
  {
    q: "What network does this run on?",
    a: "The contracts run on a public Ethereum test network (Sepolia), not mainnet. Test networks use tokens with no real-world value, which is exactly why they're a safe place to learn.",
  },
  {
    q: "Do I need to already know how crypto wallets work?",
    a: "No. You can sign in with just an email address. If you'd like to connect a wallet like MetaMask, that option is available too, but it's never required.",
  },
  {
    q: "Why would I trust the numbers I'm seeing?",
    a: "Every number in the simulator — reserves, prices, your LP position — is read directly from the smart contract's on-chain state, the same way a real DeFi app would. Nothing is faked client-side.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
      <h2 className="font-display text-3xl font-semibold tracking-tight mb-10 text-center">
        Common questions
      </h2>
      <div className="space-y-6">
        {faqs.map((item) => (
          <div key={item.q} className="border-b border-line-soft pb-6">
            <h3 className="font-display font-semibold">{item.q}</h3>
            <p className="mt-2 text-sm text-ink-soft leading-relaxed">
              {item.a}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
