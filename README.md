# V3 LP Hedging Calculator

A sophisticated Uniswap V3 liquidity provider hedging calculator that helps optimize capital protection through concentrated liquidity positions and short hedging strategies.

## Features

🎯 **Accurate Uniswap V3 Mathematics**
- Precise concentrated liquidity calculations
- Real-time token ratio determination based on price ranges
- Compatible with actual Uniswap V3 deposit amounts

📊 **Advanced Hedging Strategies**
- **Bull Market Strategy**: Lower hedge for upside capture
- **Normal Strategy**: Optimal delta hedge
- **Bear Market Strategy**: Higher hedge for downside protection

📱 **Mobile-First Design**
- Responsive design optimized for mobile devices
- Right-slide modal for price impact analysis
- Hyperliquid-inspired dark theme UI

⚡ **Real-Time Features**
- Live token price fetching from CoinGecko API
- Dynamic LP position calculations
- Interactive price scenario analysis

## Supported Tokens

- Ethereum (ETH)
- Bitcoin (BTC)
- Uniswap (UNI)
- Chainlink (LINK)
- Polygon (MATIC)
- Solana (SOL)
- Custom tokens

## How to Use

1. **Select Token & Price**: Choose your token and set entry price
2. **Set Price Range**: Define your concentrated liquidity range
3. **Input Deposit Amount**: Enter either token amount or USDC amount
4. **Choose Strategy**: Select Bull/Normal/Bear market strategy
5. **Analyze Results**: View detailed price impact analysis

## Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **API**: CoinGecko Price API
- **Mathematics**: Uniswap V3 concentrated liquidity formulas
- **Design**: Dark theme, mobile-responsive

## Live Demo

🚀 **[Try the Calculator](https://your-username.github.io/v3-hedge-calculator/)**

## Local Development

```bash
# Clone the repository
git clone https://github.com/your-username/v3-hedge-calculator.git

# Open index.html in your browser
# No build process required - pure HTML/CSS/JS
```

## Mathematical Foundation

This calculator implements the exact Uniswap V3 mathematical formulas:

- **Liquidity**: `L = amount / (2√P - P/√Pb - √Pa)`
- **Token Distribution**: Based on current price relative to range
- **LP P&L**: Current LP value - Initial investment
- **Optimal Short**: Delta-neutral hedging calculations

## License

MIT License - Feel free to use and modify!

## Contributing

Pull requests welcome! This is an open-source project aimed at helping DeFi users optimize their LP strategies.

---

*Built with ❤️ for the DeFi community*