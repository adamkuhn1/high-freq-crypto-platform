'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Trade {
  id: string
  symbol: string
  price: string
  side: 'buy' | 'sell'
  timestamp: string
  amount: string
}

interface TradeWithFlash extends Trade {
  flashKey: number
}

const MAX_TRADES = 100
const BATCH_INTERVAL_MS = 16

export default function OrderBook() {
  const [trades, setTrades] = useState<TradeWithFlash[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const pendingTradesRef = useRef<Trade[]>([])
  const flashCounterRef = useRef(0)
  const wsRef = useRef<WebSocket | null>(null)
  const batchTimerRef = useRef<number | null>(null)

  const processBatch = useCallback(() => {
    if (pendingTradesRef.current.length === 0) return

    const newTrades = pendingTradesRef.current.splice(0)
    
    setTrades((prev) => {
      const updated = [...newTrades.map(trade => ({
        ...trade,
        flashKey: flashCounterRef.current++
      })), ...prev]
      
      return updated.slice(0, MAX_TRADES)
    })

    batchTimerRef.current = null
  }, [])

  const scheduleBatch = useCallback(() => {
    if (batchTimerRef.current === null) {
      batchTimerRef.current = window.requestAnimationFrame(() => {
        processBatch()
      })
    }
  }, [processBatch])

  const addTrade = useCallback((trade: Trade) => {
    pendingTradesRef.current.push(trade)
    scheduleBatch()
  }, [scheduleBatch])

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket('ws://localhost:8000/ws')
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          if (message.data) {
            const trade: Trade = {
              id: message.id,
              symbol: message.data.symbol || 'BTC/USD',
              price: message.data.price || '0',
              side: (message.data.side === 'sell' ? 'sell' : 'buy') as 'buy' | 'sell',
              timestamp: message.data.timestamp || new Date().toISOString(),
              amount: message.data.amount || '0'
            }
            addTrade(trade)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

      ws.onclose = () => {
        setIsConnected(false)
        console.log('WebSocket disconnected')
        setTimeout(connectWebSocket, 3000)
      }
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
      if (batchTimerRef.current !== null) {
        window.cancelAnimationFrame(batchTimerRef.current)
      }
    }
  }, [addTrade])

  const groupedTrades = useMemo(() => {
    const grouped: Record<string, TradeWithFlash[]> = {}
    trades.forEach(trade => {
      if (!grouped[trade.symbol]) {
        grouped[trade.symbol] = []
      }
      grouped[trade.symbol].push(trade)
    })
    return grouped
  }, [trades])

  const formatPrice = (price: string) => {
    const num = parseFloat(price)
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount)
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 4,
      maximumFractionDigits: 4
    })
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    })
  }

  return (
    <div className="w-full h-full">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-bloomberg-text">Recent Trades</h2>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-bloomberg-green' : 'bg-bloomberg-red'}`} />
          <span className="text-sm text-bloomberg-text-dim">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="bg-bloomberg-panel border border-bloomberg-border rounded-lg overflow-hidden">
        <div className="overflow-y-auto max-h-[600px]">
          <table className="w-full text-sm font-mono">
            <thead className="sticky top-0 bg-bloomberg-panel border-b border-bloomberg-border">
              <tr className="text-bloomberg-text-dim text-xs">
                <th className="text-left p-3 font-semibold">Time</th>
                <th className="text-left p-3 font-semibold">Symbol</th>
                <th className="text-right p-3 font-semibold">Price</th>
                <th className="text-right p-3 font-semibold">Amount</th>
                <th className="text-center p-3 font-semibold">Side</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {trades.map((trade) => (
                  <motion.tr
                    key={`${trade.id}-${trade.flashKey}`}
                    initial={{ opacity: 0, backgroundColor: trade.side === 'buy' ? 'rgba(63, 185, 80, 0.2)' : 'rgba(248, 81, 73, 0.2)' }}
                    animate={{ opacity: 1, backgroundColor: 'transparent' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="border-b border-bloomberg-border/50 hover:bg-bloomberg-border/20"
                  >
                    <td className="p-3 text-bloomberg-text-dim">{formatTime(trade.timestamp)}</td>
                    <td className="p-3 text-bloomberg-text">{trade.symbol}</td>
                    <td className={`p-3 text-right font-semibold ${
                      trade.side === 'buy' ? 'text-bloomberg-green' : 'text-bloomberg-red'
                    }`}>
                      {formatPrice(trade.price)}
                    </td>
                    <td className="p-3 text-right text-bloomberg-text">{formatAmount(trade.amount)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        trade.side === 'buy'
                          ? 'bg-bloomberg-green/20 text-bloomberg-green'
                          : 'bg-bloomberg-red/20 text-bloomberg-red'
                      }`}>
                        {trade.side.toUpperCase()}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {trades.length === 0 && (
            <div className="p-8 text-center text-bloomberg-text-dim">
              Waiting for trades...
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 text-xs text-bloomberg-text-dim">
        Showing {trades.length} of {trades.length} recent trades
      </div>
    </div>
  )
}
