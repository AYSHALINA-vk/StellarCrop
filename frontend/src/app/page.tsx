import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* ambient background glow */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-green-700 blur-3xl animate-glow pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[400px] h-[400px] rounded-full bg-emerald-500 blur-3xl animate-glow pointer-events-none" />

      <section className="relative max-w-5xl mx-auto px-6 pt-24 pb-20">
        <div className="text-xs uppercase tracking-widest text-green-400 mb-4 animate-fade-up">
          Built on Stellar
        </div>

        <h1 className="text-5xl sm:text-6xl font-bold mb-6 leading-tight animate-fade-up delay-1">
          <span className="inline-block hover:scale-[1.02] transition-transform duration-300">
            StellarCrop
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-neutral-300 mb-4 animate-fade-up delay-2">
          Farm-to-table traceability, tokenized on Stellar.
        </p>

        <p className="text-lg text-neutral-400 max-w-2xl mb-10 animate-fade-up delay-3">
          Every crop batch, tokenized. Every hand it passes through, verified on-chain.
          Every consumer, one scan away from the truth.
        </p>

        <div className="flex gap-4 animate-fade-up delay-4">
          <Link
            href="/select"
            className="bg-green-700 hover:bg-green-500 hover:shadow-lg hover:shadow-green-700/30 hover:-translate-y-0.5 rounded-lg px-6 py-3 font-medium transition-all duration-300"
          >
            Enter Demo
          </Link>
           <a
            href="https://github.com/AYSHALINA-vk/StellarCrop"
            target="_blank"
            className="border border-neutral-700 hover:border-neutral-400 hover:-translate-y-0.5 rounded-lg px-6 py-3 font-medium transition-all duration-300"
          >
            View Source
          </a>
        </div>
      </section>

      <section className="relative max-w-5xl mx-auto px-6 py-16 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-neutral-900">
        {[
          ["🌾", "Farmer", "Tokenizes each batch with harvest date, expiry, and region — hashed and anchored on-chain."],
          ["📦", "Wholesaler & Retailer", "Browse verified crop listings, claim batches, and move real Stellar assets down the chain."],
          ["🛒", "Consumer", "Scan a QR code to see the full, tamper-evident chain of custody — farm to table."],
        ].map(([emoji, title, desc], i) => (
          <div
            key={title}
            className={`bg-neutral-900 border border-neutral-800 rounded-xl p-6 transition-all duration-300 hover:border-green-700/60 hover:-translate-y-1 hover:shadow-xl hover:shadow-green-900/20 animate-fade-up`}
            style={{ animationDelay: `${0.6 + i * 0.15}s` }}
          >
            <div className="text-3xl mb-3 animate-float" style={{ animationDelay: `${i * 0.4}s` }}>
              {emoji}
            </div>
            <div className="font-semibold mb-2">{title}</div>
            <div className="text-sm text-neutral-400">{desc}</div>
          </div>
        ))}
      </section>
    </main>
  );
}