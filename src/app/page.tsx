import Link from 'next/link';
import { ShoppingBag, Store, TrendingUp, Zap } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      {/* Navigation */}
      <nav className="border-b border-slate-700 px-6 py-4">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Vendor Nexus</h1>
          <div className="flex gap-4">
            <Link
              href="/auth/login"
              className="rounded-lg px-4 py-2 text-slate-300 hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h2 className="mb-6 text-5xl font-bold text-white">
          Launch Your Multi-Vendor
          <span className="text-indigo-400"> Marketplace</span>
        </h2>
        <p className="mx-auto mb-8 max-w-2xl text-xl text-slate-400">
          Empower entrepreneurs with real-time inventory sync, dynamic pricing,
          and automated vendor payouts powered by Stripe Connect.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/marketplace"
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            <ShoppingBag size={20} />
            Browse Marketplace
          </Link>
          <Link
            href="/vendor/onboarding"
            className="flex items-center gap-2 rounded-lg border border-slate-600 px-6 py-3 font-semibold text-white hover:bg-slate-800"
          >
            <Store size={20} />
            Become a Seller
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <FeatureCard
            icon={<Store className="text-indigo-400" size={32} />}
            title="Vendor Management"
            description="Streamlined onboarding, commission tracking, and automated payouts via Stripe Connect."
          />
          <FeatureCard
            icon={<Zap className="text-yellow-400" size={32} />}
            title="Real-time Inventory"
            description="Synchronized stock levels with low-stock alerts and automatic listing deactivation."
          />
          <FeatureCard
            icon={<TrendingUp className="text-green-400" size={32} />}
            title="Dynamic Pricing"
            description="Flash sales, bulk discounts, and AI-powered price optimization suggestions."
          />
          <FeatureCard
            icon={<ShoppingBag className="text-pink-400" size={32} />}
            title="Unified Checkout"
            description="Multi-vendor cart with intelligent shipping consolidation and split payments."
          />
        </div>
      </section>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-6">
      <div className="mb-4">{icon}</div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-400">{description}</p>
    </div>
  );
}