# Finance.

> **We put bloomberg-grade data behind a chat interface and open-sourced it** - Access institutional-grade financial data, run complex code analyses, and create stunning visualizations through natural language. The backend? 1 search API.

**[Try the live demo at finance.valyu.ai](https://finance.valyu.ai)**

![Finance by Valyu](public/valyu.png)

## Why Finance?

**Your AI's search is only as good as the data it's searching over.**

Traditional financial research is fragmented across dozens of expensive platforms. Finance changes everything by being powered by **[Valyu](https://platform.valyu.ai)** - the world's most powerful search API for AI agents. This isn't just another chatbot; it's a Bloomberg terminal powered by AI with access to:

- **Live Global Market Data** - Real-time prices, volumes, and technical indicators across 50+ global exchanges
- **SEC Filings Index** - Specialized search across 10-Ks, 10-Qs, 8-Ks, proxy statements, and insider trading reports
- **Patent Database** - Search and analyze patents across jurisdictions
- **Academic Research** - arXiv papers, Wiley finance journals, and academic publications
- **The World's Most Powerful Web Search** - Real-time news, social sentiment, and market analysis

[See how Valyu compares to other search APIs](https://www.valyu.ai/blogs/benchmarking-search-apis-for-ai-agents) - Independent benchmarks show why Valyu delivers superior results for AI agents.

Finance makes all this data accessible through natural language:

- **Institutional-Grade Data** - SEC filings, real-time market data, financial statements, insider trading, and more
- **One Unified Search** - Powered by Valyu's comprehensive data API
- **Advanced Analytics** - Execute Python code in secure Daytona sandboxes for ML models, backtesting, and custom analysis
- **Interactive Visualizations** - Beautiful charts and dashboards that bring data to life
- **Real-Time Intelligence** - Web search integration for breaking news and market updates
- **Local AI Models** - Run with Ollama or LM Studio for unlimited, private queries
- **Natural Language** - Just ask questions like you would to a colleague

## Key Features

### Powerful Financial Tools

- **SEC Filings Analysis** - Deep dive into 10-Ks, 10-Qs, 8-Ks, and more
- **Market Data** - Real-time and historical stock prices, volumes, and technical indicators
- **Financial Statements** - Income statements, balance sheets, cash flows with automatic calculations
- **Insider Trading** - Track institutional and insider transactions
- **Academic Research** - Access to arXiv papers and financial research
- **News & Sentiment** - Real-time news analysis with market impact assessment

### Advanced Tool Calling

- **Python Code Execution** - Run complex financial models, ML algorithms, and custom analyses
- **Interactive Charts** - Create publication-ready visualizations
- **Multi-Source Research** - Automatically aggregates data from multiple sources
- **Export & Share** - Download results, share analyses, and collaborate

## Quick Start (Self-Hosted Mode)

Self-hosted mode is the recommended way to run Finance. It's easy to set up and requires no external authentication or Supabase.

### Prerequisites

- Node.js 18+
- npm or yarn
- Valyu API key (get one at [platform.valyu.ai](https://platform.valyu.ai))
- Daytona API key (for code execution)
- [Ollama](https://ollama.com) or [LM Studio](https://lmstudio.ai) installed (optional but recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yorkeccak/finance.git
   cd finance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env.local` file in the root directory:

   ```env
   # Enable Self-Hosted Mode (No Supabase, No Auth, No Billing)
   NEXT_PUBLIC_APP_MODE=self-hosted

   # Valyu API Configuration (Required)
   VALYU_API_KEY=your-valyu-api-key

   # Daytona Configuration (Required for Python execution)
   DAYTONA_API_KEY=your-daytona-api-key
   DAYTONA_API_URL=https://api.daytona.io  # Optional
   DAYTONA_TARGET=latest  # Optional

   # Local LLM Configuration (Optional - for unlimited, private queries)
   OLLAMA_BASE_URL=http://localhost:11434   # Default Ollama URL
   LMSTUDIO_BASE_URL=http://localhost:1234  # Default LM Studio URL

   # OpenAI Configuration (Optional - fallback if local models unavailable)
   OPENAI_API_KEY=your-openai-api-key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

   You'll be automatically logged in as `dev@localhost` - no sign-up required!

## Self-Hosted Mode Guide

### What is Self-Hosted Mode?

Self-hosted mode provides a complete local development environment without any external dependencies beyond the core APIs (Valyu, Daytona). It's perfect for:

- **Local Development** - No Supabase setup required
- **Offline Work** - All data stored locally in SQLite
- **Testing Features** - Unlimited queries without billing
- **Privacy** - Use local Ollama models, no cloud LLM needed
- **Quick Prototyping** - No authentication or rate limits

### How It Works

When `NEXT_PUBLIC_APP_MODE=self-hosted`:

1. **Local SQLite Database** (`/.local-data/dev.db`)
   - Automatically created on first run
   - Stores chat sessions, messages, charts, and CSVs
   - Full schema matching production Supabase tables
   - Easy to inspect with `sqlite3 .local-data/dev.db`

2. **Mock Authentication**
   - Auto-login as dev user (`dev@localhost`)
   - No sign-up/sign-in required
   - Unlimited tier access with all features

3. **No Rate Limits**
   - Unlimited chat queries
   - No usage tracking
   - No billing integration

4. **LLM Selection**
   - **Ollama models** (if installed) - Used first, unlimited and free
   - **LM Studio models** (if installed) - Alternative local option with GUI
   - **OpenAI** (if API key provided) - Fallback if no local models available
   - See local models indicator in top-right corner with provider switching

### Choosing Between Ollama and LM Studio

Finance supports both **Ollama** and **LM Studio** for running local LLMs. Both are free, private, and work offline - choose based on your preferences:

**Ollama** - Best for developers and terminal users
- Lightweight and fast
- Simple CLI commands
- Automatic model management
- Great for headless servers
- Lower resource usage

**LM Studio** - Best for visual users and beginners
- Beautiful GUI with model browser
- Real-time GPU/CPU monitoring
- Easy model downloading and management
- Visual server status and controls
- Built-in prompt testing

**You can use both!** Finance detects both automatically and lets you switch between them with a provider selector in the UI.

### Setting Up Ollama

Ollama provides unlimited, private LLM inference on your local machine - completely free and runs offline!

**Quick Setup (No Terminal Required):**

1. **Download Ollama App**
   - Visit [ollama.com](https://ollama.com) and download the app for your OS
   - Install and open the Ollama app
   - It runs in your menu bar (macOS) or system tray (Windows/Linux)

2. **Download a Model**
   - Open Ollama app and browse available models
   - Download `qwen2.5:7b` (recommended - best for Finance features)
   - Or choose from: `llama3.1`, `mistral`, `deepseek-r1`
   - That's it! Finance will automatically detect and use it

3. **Use in Finance**
   - Start Finance in self-hosted mode
   - Ollama status indicator appears in top-right corner
   - Shows your available models
   - Click to select which model to use

**Advanced Setup (Terminal):**

```bash
# Install Ollama
brew install ollama              # macOS
# OR
curl -fsSL https://ollama.com/install.sh | sh  # Linux

# Start Ollama service
ollama serve

# Download recommended models
ollama pull qwen2.5:7b          # Recommended - excellent tool support
ollama pull llama3.1:8b         # Alternative - good performance
ollama pull mistral:7b          # Alternative - fast
ollama pull deepseek-r1:7b      # For reasoning/thinking mode
```

### Setting Up LM Studio (Alternative)

LM Studio provides a beautiful GUI for running local LLMs - perfect if you prefer visual interfaces over terminal commands!

1. **Download LM Studio**
   - Visit [lmstudio.ai](https://lmstudio.ai) and download for your OS
   - Install and open LM Studio

2. **Download Models**
   - Click on the Search icon in LM Studio
   - Browse available models or search for recommended ones
   - Click download and wait for it to complete

3. **Start the Server**
   - Click the LM Studio logo in your macOS menu bar (top-right corner)
   - Select **"Start Server on Port 1234..."**
   - Server starts immediately - you'll see the status change to "Running"
   - That's it! Finance will automatically detect it

4. **Important: Configure Context Window**
   - This app uses extensive tool descriptions that require adequate context length
   - In LM Studio, when loading a model:
     - Click on the model settings (gear icon)
     - Set **Context Length** to **at least 8192 tokens** (16384+ recommended)

### Managing Local Database

**View Database:**
```bash
sqlite3 .local-data/dev.db
# Then run SQL queries
SELECT * FROM chat_sessions;
SELECT * FROM charts;
```

**Reset Database:**
```bash
rm -rf .local-data/
# Database recreated on next app start
```

**Backup Database:**
```bash
cp -r .local-data/ .local-data-backup/
```

## Valyu Mode (Optional)

> **Note:** Valyu OAuth apps will be in general availability soon. Currently client id/secret are not publicly available. Contact contact@valyu.ai if you need access.

Valyu mode is used by [finance.valyu.ai](https://finance.valyu.ai) for production deployment with full authentication and billing through Valyu credits.

### Prerequisites for Valyu Mode

- Node.js 18+
- Valyu OAuth credentials (contact contact@valyu.ai)
- OpenAI API key
- Daytona API key
- Supabase account and project

### Valyu Mode Configuration

```env
# Enable Valyu Mode
NEXT_PUBLIC_APP_MODE=valyu
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Valyu OAuth Credentials (contact contact@valyu.ai)
NEXT_PUBLIC_VALYU_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_VALYU_CLIENT_ID=your-client-id
VALYU_CLIENT_SECRET=your-client-secret
VALYU_APP_URL=https://platform.valyu.ai

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key

# Daytona Configuration
DAYTONA_API_KEY=your-daytona-api-key

# Your App's Supabase (for user data)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Example Queries

Try these powerful queries to see what Finance can do:

- "Build a Monte Carlo simulation to predict Tesla's stock price in 6 months"
- "Analyze GameStop's latest 10-K filing and extract key financial metrics"
- "Research how Trump's latest statements affect Elon Musk's companies"
- "Create an interactive dashboard comparing the 'Magnificent 7' stocks"
- "Do an in-depth report on COVID-19's effect on Pfizer with insider trading data"
- "Analyze PepsiCo's recent SEC filings and calculate key financial ratios"

**With Local Models (Ollama/LM Studio):**
- Run unlimited queries without API costs
- Keep all your financial analysis completely private
- Perfect for sensitive research and proprietary strategies
- Choose your preferred interface: terminal (Ollama) or GUI (LM Studio)

## Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-5 with function calling + Ollama/LM Studio for local models
- **Data**: Valyu API for comprehensive financial data
- **Code Execution**: Daytona sandboxes for secure Python execution
- **Visualizations**: Recharts for interactive charts
- **Real-time**: Streaming responses with Vercel AI SDK
- **Local Models**: Ollama and LM Studio integration for private, unlimited queries

## Security

- Secure API key management
- Sandboxed code execution via Daytona
- No storage of sensitive financial data
- HTTPS encryption for all API calls

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Acknowledgments

- Built with [Valyu](https://platform.valyu.ai) - The unified financial data API
- Powered by [Daytona](https://daytona.io) - Secure code execution
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

<p align="center">
  Made with love by the Valyu team
</p>

<p align="center">
  <a href="https://twitter.com/valyuOfficial">Twitter</a> -
  <a href="https://www.linkedin.com/company/valyu-ai">LinkedIn</a> -
  <a href="https://github.com/yorkeccak/finance">GitHub</a>
</p>
