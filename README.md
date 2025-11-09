# Finance.

> **We put Bloomberg terminal behind a chat interface and open-sourced it** - Access institutional-grade financial data, run complex code analyses, and create stunning visualizations through natural language. The backend? 1 search API.

🚀 **[Try the live demo at finance.valyu.ai](https://finance.valyu.ai)**

![Finance by Valyu](public/valyu.png)

## Why Finance?

Traditional financial research is fragmented across dozens of expensive platforms. Finance changes everything by providing:

- **📊 Institutional-Grade Data** - SEC filings, real-time market data, financial statements, insider trading, and more
- **🔍 One Unified Search** - Powered by Valyu's comprehensive financial data API
- **🐍 Advanced Analytics** - Execute Python code in secure Daytona sandboxes for ML models, backtesting, and custom analysis
- **📈 Interactive Visualizations** - Beautiful charts and dashboards that bring data to life
- **🌐 Real-Time Intelligence** - Web search integration for breaking news and market updates
- **🏠 Local AI Models** - Run with Ollama or LM Studio for unlimited, private queries using your own hardware
- **🎯 Natural Language** - Just ask questions like you would to a colleague

## Key Features

### 🔥 Powerful Financial Tools

- **SEC Filings Analysis** - Deep dive into 10-Ks, 10-Qs, 8-Ks, and more
- **Market Data** - Real-time and historical stock prices, volumes, and technical indicators  
- **Financial Statements** - Income statements, balance sheets, cash flows with automatic calculations
- **Insider Trading** - Track institutional and insider transactions
- **Academic Research** - Access to arXiv papers and financial research
- **News & Sentiment** - Real-time news analysis with market impact assessment

### 🛠️ Advanced Tool Calling

- **Python Code Execution** - Run complex financial models, ML algorithms, and custom analyses
- **Interactive Charts** - Create publication-ready visualizations
- **Multi-Source Research** - Automatically aggregates data from multiple sources
- **Export & Share** - Download results, share analyses, and collaborate

## 🚀 Quick Start

### Two Modes: Production vs Development

Finance supports two distinct operating modes:

**🌐 Production Mode** (Default)
- Uses Supabase for authentication and database
- OpenAI/Vercel AI Gateway for LLM
- Rate limiting (5 queries/day for free tier)
- Billing and usage tracking via Polar
- Full authentication required

**💻 Development Mode** (Recommended for Local Development)
- **No Supabase required** - Uses local SQLite database
- **No authentication needed** - Auto-login as dev user
- **Unlimited queries** - No rate limits
- **No billing/tracking** - Polar integration disabled
- **Works offline** - Complete local development
- **Ollama/LM Studio integration** - Use local LLMs for privacy and unlimited usage

### Prerequisites

**For Production Mode:**
- Node.js 18+
- npm or yarn
- OpenAI API key
- Valyu API key (get one at [platform.valyu.ai](https://platform.valyu.ai))
- Daytona API key (for code execution)
- Supabase account and project
- Polar account (for billing)

**For Development Mode (Recommended for getting started):**
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

   **For Development Mode (Easy Setup):**
   ```env
   # Enable Development Mode (No Supabase, No Auth, No Billing)
   NEXT_PUBLIC_APP_MODE=development

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

   **For Production Mode:**
   ```env
   # OpenAI Configuration (Required)
   OPENAI_API_KEY=your-openai-api-key

   # Valyu API Configuration (Required)
   VALYU_API_KEY=your-valyu-api-key

   # Daytona Configuration (Required)
   DAYTONA_API_KEY=your-daytona-api-key

   # Supabase Configuration (Required)
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

   # Polar Billing (Required)
   POLAR_WEBHOOK_SECRET=your-polar-webhook-secret
   POLAR_UNLIMITED_PRODUCT_ID=your-product-id

   # App Configuration
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

   - **Development Mode**: You'll be automatically logged in as `dev@localhost`
   - **Production Mode**: You'll need to sign up/sign in

## 🏠 Development Mode Guide

### What is Development Mode?

Development mode provides a complete local development environment without any external dependencies beyond the core APIs (Valyu, Daytona). It's perfect for:

- **Local Development** - No Supabase setup required
- **Offline Work** - All data stored locally in SQLite
- **Testing Features** - Unlimited queries without billing
- **Privacy** - Use local Ollama models, no cloud LLM needed
- **Quick Prototyping** - No authentication or rate limits

### How It Works

When `NEXT_PUBLIC_APP_MODE=development`:

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

**🦙 Ollama** - Best for developers and terminal users
- ✅ Lightweight and fast
- ✅ Simple CLI commands
- ✅ Automatic model management
- ✅ Great for headless servers
- ✅ Lower resource usage
- ❌ Less visual feedback
- ❌ No built-in GPU monitoring

**🎨 LM Studio** - Best for visual users and beginners
- ✅ Beautiful GUI with model browser
- ✅ Real-time GPU/CPU monitoring
- ✅ Easy model downloading and management
- ✅ Visual server status and controls
- ✅ Built-in prompt testing
- ❌ Slightly more resource intensive
- ❌ GUI required (not headless)

**💡 You can use both!** Finance detects both automatically and lets you switch between them with a provider selector in the UI.

### Setting Up Ollama

Ollama provides unlimited, private LLM inference on your local machine - completely free and runs offline!

**🚀 Quick Setup (No Terminal Required):**

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
   - Start Finance in development mode
   - Ollama status indicator appears in top-right corner
   - Shows your available models
   - Click to select which model to use
   - Icons show capabilities: 🔧 (tools) and 🧠 (reasoning)

**⚡ Advanced Setup (Terminal):**

If you prefer using the terminal:

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

**💡 It Just Works:**
- Finance automatically detects Ollama when it's running
- No configuration needed
- Automatically falls back to OpenAI if Ollama is unavailable
- Switch between models anytime via the local models popup

### Setting Up LM Studio (Alternative)

LM Studio provides a beautiful GUI for running local LLMs - perfect if you prefer visual interfaces over terminal commands!

**🎨 Easy Setup with GUI:**

1. **Download LM Studio**
   - Visit [lmstudio.ai](https://lmstudio.ai) and download for your OS
   - Install and open LM Studio
   - The app provides a full GUI for managing models

2. **Download Models**
   - Click on the 🔍 Search icon in LM Studio
   - Browse available models or search for:
     - `qwen/qwen3-14b` (recommended - excellent tool support)
     - `openai/gpt-oss-20b` (OpenAI's open source model with reasoning)
     - `google/gemma-3-12b` (Google's model with good performance)
     - `qwen/qwen3-4b-thinking-2507` (reasoning model)
   - Click download and wait for it to complete
   - Models are cached locally for offline use

3. **Start the Server**
   - Click the LM Studio logo in your macOS menu bar (top-right corner)
   - Select **"Start Server on Port 1234..."**

   ![LM Studio Start Server](public/lmstudio-start.png)

   - Server starts immediately - you'll see the status change to "Running"
   - That's it! Finance will automatically detect it

4. **Use in Finance**
   - Start Finance in development mode
   - Local models indicator appears in top-right corner
   - If both Ollama and LM Studio are running, you'll see a provider switcher
   - Click to select which provider and model to use
   - Icons show capabilities: 🔧 (tools) and 🧠 (reasoning)

**⚙️ Configuration:**
- Default URL: `http://localhost:1234`
- Can be customized in `.env.local`:
  ```env
  LMSTUDIO_BASE_URL=http://localhost:1234
  ```

**💡 LM Studio Features:**
- Real-time GPU/CPU usage monitoring
- Easy model comparison and testing
- Visual prompt builder
- Chat history within LM Studio
- No terminal commands needed

### Switching Between Providers

If you have both Ollama and LM Studio running, Finance automatically detects both and shows a beautiful provider switcher in the local models popup:

- **Visual Selection**: Click provider buttons with logos
- **Seamless Switching**: Switch between providers without reloading
- **Independent Models**: Each provider shows its own model list
- **Automatic Detection**: No manual configuration needed

The provider switcher appears automatically when multiple providers are detected!

### Model Capabilities

Not all models support all features. Here's what works:

**Tool Calling Support** (Execute Python, search web, create charts):
- ✅ qwen2.5, qwen3, deepseek-r1, deepseek-v3
- ✅ llama3.1, llama3.2, llama3.3
- ✅ mistral, mistral-nemo, mistral-small
- ✅ See full list in Ollama popup (wrench icon)

**Thinking/Reasoning Support** (Show reasoning steps):
- ✅ deepseek-r1, qwen3, magistral
- ✅ gpt-oss, cogito
- ✅ See full list in Ollama popup (brain icon)

**What happens if model lacks tool support?**
- You'll see a friendly dialog explaining limitations
- Can continue with text-only responses
- Or switch to a different model that supports tools

### Development Mode Features

✅ **Full Chat History**
- All conversations saved to local SQLite
- Persists across restarts
- View/delete old sessions

✅ **Charts & Visualizations**
- Created charts saved locally
- Retrievable via markdown syntax
- Rendered from local database

✅ **CSV Data Tables**
- Generated CSVs stored in SQLite
- Inline table rendering
- Full data persistence

✅ **No Hidden Costs**
- No OpenAI API usage (when using Ollama)
- No Supabase database costs
- No authentication service costs

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

### Switching Between Modes

**Development → Production:**
1. Remove/comment `NEXT_PUBLIC_APP_MODE=development`
2. Add all Supabase and Polar environment variables
3. Restart server

**Production → Development:**
1. Add `NEXT_PUBLIC_APP_MODE=development`
2. Restart server
3. Local database automatically created

**Note:** Your production Supabase data and local SQLite data are completely separate. Switching modes doesn't migrate data.

### Troubleshooting Development Mode

**Sidebar won't open on homepage:**
- Fixed! Sidebar now respects dock setting even on homepage

**Local models not detected:**
- **Ollama**: Make sure Ollama is running: `ollama serve`
  - Check Ollama URL in `.env.local` (default: `http://localhost:11434`)
  - Verify models are installed: `ollama list`
- **LM Studio**: Click LM Studio menu bar icon → "Start Server on Port 1234..."
  - Check LM Studio URL in `.env.local` (default: `http://localhost:1234`)
  - Verify at least one model is downloaded in LM Studio
  - Server must be running for Finance to detect it

**Database errors:**
- Delete and recreate: `rm -rf .local-data/`
- Check file permissions in `.local-data/` directory

**Auth errors:**
- Verify `NEXT_PUBLIC_APP_MODE=development` is set
- Clear browser localStorage and cache
- Restart dev server

For more details, see [DEVELOPMENT_MODE.md](DEVELOPMENT_MODE.md)

## 💡 Example Queries

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

## 🏗️ Architecture

- **Frontend**: Next.js 15 with App Router, Tailwind CSS, shadcn/ui
- **AI**: OpenAI GPT-5 with function calling + Ollama/LM Studio for local models
- **Data**: Valyu API for comprehensive financial data
- **Code Execution**: Daytona sandboxes for secure Python execution
- **Visualizations**: Recharts for interactive charts
- **Real-time**: Streaming responses with Vercel AI SDK
- **Local Models**: Ollama and LM Studio integration for private, unlimited queries

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

- Built with [Valyu](https://platform.valyu.ai) - The unified financial data API
- Powered by [Daytona](https://daytona.io) - Secure code execution
- UI components from [shadcn/ui](https://ui.shadcn.com)

---

<p align="center">
  Made with ❤️ by the Valyu team
</p>

<p align="center">
  <a href="https://twitter.com/ValyuNetwork">Twitter</a> •
  <a href="https://www.linkedin.com/company/valyu-ai">LinkedIn</a> •
  <a href="https://github.com/yorkeccak/finance">GitHub</a>
</p>
