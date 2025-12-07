import Foundation
import Combine

struct PricePoint: Identifiable {
    let id = UUID()
    let timestamp: Date
    let price: Double
}

struct TradeMessage: Codable {
    let id: String
    let data: TradeData
}

struct TradeData: Codable {
    let symbol: String
    let price: String
    let side: String
    let timestamp: String
    let amount: String
}

class WebSocketManager: NSObject, ObservableObject, URLSessionWebSocketDelegate {
    @Published var isConnected: Bool = false
    @Published var currentPrice: Double = 0.0
    @Published var lastMessage: String?
    @Published var priceHistory: [PricePoint] = []
    
    private var webSocketTask: URLSessionWebSocketTask?
    private var urlSession: URLSession?
    private let url: URL
    private let maxHistoryPoints = 50
    
    init(url: URL) {
        self.url = url
        super.init()
        self.urlSession = URLSession(configuration: .default, delegate: self, delegateQueue: OperationQueue())
    }
    
    func connect() {
        guard let urlSession = urlSession else { return }
        
        webSocketTask = urlSession.webSocketTask(with: url)
        webSocketTask?.resume()
        
        receive()
    }
    
    func disconnect() {
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        isConnected = false
    }
    
    func send(message: String) {
        let message = URLSessionWebSocketTask.Message.string(message)
        webSocketTask?.send(message) { error in
            if let error = error {
                print("WebSocket send error: \(error)")
            }
        }
    }
    
    private func receive() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                self.receive()
            case .failure(let error):
                print("WebSocket receive error: \(error)")
                self.isConnected = false
                DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                    self.connect()
                }
            }
        }
    }
    
    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8) else { return }
        
        do {
            let message = try JSONDecoder().decode(TradeMessage.self, from: data)
            
            DispatchQueue.main.async {
                if let price = Double(message.data.price) {
                    self.currentPrice = price
                    self.lastMessage = text
                    
                    let pricePoint = PricePoint(
                        timestamp: Date(),
                        price: price
                    )
                    
                    self.priceHistory.append(pricePoint)
                    
                    if self.priceHistory.count > self.maxHistoryPoints {
                        self.priceHistory.removeFirst()
                    }
                }
            }
        } catch {
            print("Error decoding message: \(error)")
        }
    }
    
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didOpenWithProtocol protocol: String?) {
        DispatchQueue.main.async {
            self.isConnected = true
        }
    }
    
    func urlSession(_ session: URLSession, webSocketTask: URLSessionWebSocketTask, didCloseWith closeCode: URLSessionWebSocketTask.CloseCode, reason: Data?) {
        DispatchQueue.main.async {
            self.isConnected = false
        }
    }
}
