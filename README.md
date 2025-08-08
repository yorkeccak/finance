# Finance by Valyu 🚀

> **The most powerful financial AI assistant** - Access institutional-grade financial data, run complex analyses, and create stunning visualizations, all through natural conversation.

![Finance by Valyu](public/valyu.png)

## 🌟 Why Finance by Valyu?

Traditional financial research is fragmented across dozens of expensive platforms. Finance by Valyu changes everything by providing:

- **📊 Institutional-Grade Data** - SEC filings, real-time market data, financial statements, insider trading, and more
- **🔍 One Unified Search** - Powered by Valyu's comprehensive financial data API
- **🐍 Advanced Analytics** - Execute Python code in secure Daytona sandboxes for ML models, backtesting, and custom analysis
- **📈 Interactive Visualizations** - Beautiful charts and dashboards that bring data to life
- **🌐 Real-Time Intelligence** - Web search integration for breaking news and market updates
- **🎯 Natural Language** - Just ask questions like you would to a colleague

## ✨ Key Features

### 🔥 Powerful Financial Tools

- **SEC Filings Analysis** - Deep dive into 10-Ks, 10-Qs, 8-Ks, and more
- **Market Data** - Real-time and historical stock prices, volumes, and technical indicators  
- **Financial Statements** - Income statements, balance sheets, cash flows with automatic calculations
- **Insider Trading** - Track institutional and insider transactions
- **Academic Research** - Access to arXiv papers and financial research
- **News & Sentiment** - Real-time news analysis with market impact assessment

### 🛠️ Advanced Capabilities

- **Python Code Execution** - Run complex financial models, ML algorithms, and custom analyses
- **Interactive Charts** - Create publication-ready visualizations
- **Multi-Source Research** - Automatically aggregates data from multiple sources
- **Export & Share** - Download results, share analyses, and collaborate

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- OpenAI API key
- Valyu API key (get one at [valyu.network](https://valyu.network))
- Daytona API key (for code execution)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/finance-by-valyu.git
   cd finance-by-valyu
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file in the root directory:
   ```env
   # OpenAI Configuration
   OPENAI_API_KEY=your-openai-api-key
   
   # Valyu API Configuration
   VALYU_API_KEY=your-valyu-api-key
   
   # Daytona Configuration (for Python execution)
   DAYTONA_API_KEY=your-daytona-api-key
   DAYTONA_API_URL=https://api.daytona.io  # Optional
   DAYTONA_TARGET=latest  # Optional
   
   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000  # Your deployment URL in production
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 💡 Example Queries

Try these powerful queries to see what Finance by Valyu can do:

- "Analyze Apple's latest 10-K filing and create a DCF model"
- "Compare Tesla's financial metrics with traditional automakers"
- "Build a Python model to backtest a momentum trading strategy on SPY"
- "What are the latest insider trades for semiconductor companies?"
- "Create a dashboard showing sector rotation over the past month"
- "Analyze the correlation between Fed minutes sentiment and bond yields"

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-5 with function calling
- **Data**: Valyu API for comprehensive financial data
- **Code Execution**: Daytona sandboxes for secure Python execution
- **Visualizations**: Recharts for interactive charts
- **Real-time**: Streaming responses with Vercel AI SDK

## 🔒 Security

- Secure API key management
- Sandboxed code execution via Daytona
- No storage of sensitive financial data
- HTTPS encryption for all API calls

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Built with [Valyu](https://valyu.network) - The unified financial data API
- Powered by [Daytona](https://daytona.io) - Secure code execution
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

<p align="center">
  Made with ❤️ by the Valyu team
</p>

<p align="center">
  <a href="https://twitter.com/ValyuNetwork">Twitter</a> •
  <a href="https://www.linkedin.com/company/valyu-network">LinkedIn</a> •
  <a href="https://github.com/valyu-network">GitHub</a>
</p>