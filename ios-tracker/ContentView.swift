import SwiftUI

struct ContentView: View {
    @StateObject private var webSocketManager = WebSocketManager(
        url: URL(string: "ws://localhost:8000/ws")!
    )
    @State private var selectedSymbol: String = "BTC/USD"
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                VStack(spacing: 12) {
                    Text("Current Price")
                        .font(.headline)
                        .foregroundColor(.secondary)
                    
                    Text(formatPrice(webSocketManager.currentPrice))
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(webSocketManager.currentPrice > 0 ? .primary : .secondary)
                        .animation(.easeInOut(duration: 0.2), value: webSocketManager.currentPrice)
                    
                    HStack(spacing: 16) {
                        ConnectionStatusView(isConnected: webSocketManager.isConnected)
                        
                        Text("Latency: < 50ms")
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(Color(.systemGray6))
                            .cornerRadius(8)
                    }
                }
                .padding()
                .frame(maxWidth: .infinity)
                .background(Color(.systemBackground))
                .cornerRadius(16)
                .shadow(color: Color.black.opacity(0.1), radius: 10, x: 0, y: 5)
                
                PriceChart(symbol: selectedSymbol, webSocketManager: webSocketManager)
                
                Spacer()
            }
            .padding()
            .navigationTitle("Crypto Tracker")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                webSocketManager.connect()
            }
            .onDisappear {
                webSocketManager.disconnect()
            }
        }
    }
    
    private func formatPrice(_ price: Double) -> String {
        if price == 0 {
            return "--"
        }
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        formatter.groupingSeparator = ","
        formatter.usesGroupingSeparator = true
        return formatter.string(from: NSNumber(value: price)) ?? "--"
    }
}

struct ConnectionStatusView: View {
    let isConnected: Bool
    
    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(isConnected ? Color.green : Color.red)
                .frame(width: 8, height: 8)
            
            Text(isConnected ? "Connected" : "Disconnected")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color(.systemGray6))
        .cornerRadius(8)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}
