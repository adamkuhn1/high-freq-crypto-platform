import OrderBook from '@/components/OrderBook'

export default function Home() {
  return (
    <main className="min-h-screen bg-bloomberg-bg p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 pb-4 border-b border-bloomberg-border">
          <h1 className="text-3xl font-bold text-bloomberg-text font-mono">
            Institutional Arbitrage Dashboard
          </h1>
          <p className="mt-2 text-sm text-bloomberg-text-dim">
            Real-time high-frequency trading data stream
          </p>
        </header>
        
        <div className="bg-bloomberg-panel border border-bloomberg-border rounded-lg p-6">
          <OrderBook />
        </div>
      </div>
    </main>
  )
}

