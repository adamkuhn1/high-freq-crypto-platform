import SwiftUI
import Charts

struct PriceChart: View {
    let symbol: String
    @ObservedObject var webSocketManager: WebSocketManager
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(symbol)
                .font(.headline)
                .foregroundColor(.secondary)
            
            if webSocketManager.priceHistory.isEmpty {
                VStack {
                    Spacer()
                    Text("Waiting for data...")
                        .foregroundColor(.secondary)
                    Spacer()
                }
                .frame(height: 200)
            } else {
                Chart {
                    ForEach(webSocketManager.priceHistory) { point in
                        LineMark(
                            x: .value("Time", point.timestamp, unit: .second),
                            y: .value("Price", point.price)
                        )
                        .foregroundStyle(.blue)
                        .interpolationMethod(.catmullRom)
                    }
                }
                .chartXAxis {
                    AxisMarks(values: .automatic) { _ in
                        AxisGridLine()
                        AxisValueLabel(format: .dateTime.hour().minute().second())
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisGridLine()
                        AxisValueLabel {
                            if let doubleValue = value.as(Double.self) {
                                Text(formatPrice(doubleValue))
                            }
                        }
                    }
                }
                .frame(height: 200)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
    }
    
    private func formatPrice(_ price: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: price)) ?? "0.00"
    }
}

struct PriceChart_Previews: PreviewProvider {
    static var previews: some View {
        let manager = WebSocketManager(url: URL(string: "ws://localhost:8000/ws")!)
        PriceChart(symbol: "BTC/USD", webSocketManager: manager)
    }
}
