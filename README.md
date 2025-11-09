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

## Production Deployment Guide

This guide walks you through setting up Finance for production with full authentication, billing, and database functionality.

### 1. Get API Keys

#### Valyu API (Required)

Valyu provides all the institutional-grade financial data - SEC filings, stock prices, financial statements, insider trading data, and 50+ other data sources. Without this API key, the app cannot access any financial data.

1. Go to [platform.valyu.ai](https://platform.valyu.ai)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy your API key (starts with `valyu_`)

#### OpenAI API (Required)

Used for AI chat responses, natural language understanding, and function calling.

1. Go to [platform.openai.com](https://platform.openai.com)
2. Create an account or sign in
3. Navigate to API keys
4. Create a new secret key
5. Copy the key (starts with `sk-`)

#### Daytona API (Required)

Used for secure Python code execution, enabling data analysis, visualizations, and ML models.

1. Go to [daytona.io](https://daytona.io)
2. Sign up for an account
3. Get your API key from the dashboard
4. Copy the key

### 2. Set Up Supabase Database

#### Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the project to be provisioned (2-3 minutes)
4. Go to Project Settings → API
5. Copy these values:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (keep this secret!)

#### Create Database Tables

1. In Supabase Dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy the contents of [`supabase/schema.sql`](supabase/schema.sql) and run it

#### Set Up Row Level Security

1. In the SQL Editor, create another new query
2. Copy the contents of [`supabase/policies.sql`](supabase/policies.sql) and run it

#### Configure Authentication

1. Go to **Authentication** → **Providers** in Supabase
2. Enable **Email** provider (enabled by default)
3. **Optional:** Enable OAuth providers (Google, GitHub, etc.)
   - For Google: Add OAuth credentials from Google Cloud Console
   - For GitHub: Add OAuth app credentials from GitHub Settings

4. Go to **Authentication** → **URL Configuration**
5. Add your site URL and redirect URLs:
   - Site URL: `https://yourdomain.com` (or `http://localhost:3000` for testing)
   - Redirect URLs: `https://yourdomain.com/auth/callback`

### 3. Set Up Polar Billing (Optional)

Polar provides subscription billing and payments.

1. Go to [polar.sh](https://polar.sh)
2. Create an account
3. Create your products:
   - **Pay Per Use** plan (e.g., $9.99/month)
   - **Unlimited** plan (e.g., $49.99/month)
4. Copy the Product IDs
5. Go to Settings → Webhooks
6. Create a webhook:
   - URL: `https://yourdomain.com/api/webhooks/polar`
   - Events: Select all `customer.*` and `subscription.*` events
7. Copy the webhook secret

**If you don't want billing:**
- Skip this section
- Remove billing UI from the codebase
- All users will have unlimited access

### 4. Configure Environment Variables

Create `.env.local` in your project root:

```env
# App Configuration
NEXT_PUBLIC_APP_MODE=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Valyu API (Required - powers all financial data)
# Get yours at: https://platform.valyu.ai
VALYU_API_KEY=valyu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# OpenAI Configuration
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Daytona Configuration (Code Execution)
DAYTONA_API_KEY=your-daytona-api-key
DAYTONA_API_URL=https://api.daytona.io
DAYTONA_TARGET=latest

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Polar Billing (Optional - remove if not using billing)
POLAR_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxx
POLAR_UNLIMITED_PRODUCT_ID=prod_xxxxxxxxxxxxxxxxxxxxx
```

### 5. Deploy to Production

#### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add all environment variables from `.env.local`
5. Deploy!

**Important Vercel Settings:**
- Framework Preset: Next.js
- Node.js Version: 18.x or higher
- Build Command: `npm run build`
- Output Directory: `.next`

#### Other Deployment Options

- **Netlify**: Similar to Vercel
- **Railway**: Good for full-stack apps
- **Self-hosted**: Use Docker with PM2 or similar

### 6. Post-Deployment Setup

1. **Test Authentication:**
   - Visit your site
   - Try signing up with email
   - Check that user appears in Supabase Users table

2. **Test Polar Webhooks:**
   - Subscribe to a plan
   - Check Supabase users table for `subscription_tier` update
   - Check Polar dashboard for webhook delivery

3. **Test Financial Data:**
   - Ask a question like "What is Apple's latest stock price?"
   - Verify Valyu API is returning data
   - Check that charts and CSVs are saving to database

### 7. Troubleshooting

**Authentication Issues:**
- Verify Supabase URL and keys are correct
- Check redirect URLs in Supabase dashboard
- Clear browser cookies/localStorage and try again

**Database Errors:**
- Verify all tables were created successfully
- Check RLS policies are enabled
- Review Supabase logs for detailed errors

**Billing Not Working:**
- Verify Polar webhook secret is correct
- Check Polar dashboard for webhook delivery status
- Review app logs for webhook processing errors

**No Financial Data:**
- Verify Valyu API key is set correctly in environment variables
- Check Valyu dashboard for API usage/errors
- Test API key with a curl request to Valyu

**Rate Limiting:**
- Check `user_rate_limits` table in Supabase
- Verify user's subscription tier is set correctly
- Review rate limit logic in `/api/rate-limit`

### 8. Security Best Practices

**Do:**
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (never expose client-side)
- Use environment variables for all secrets
- Enable RLS on all Supabase tables
- Regularly rotate API keys
- Use HTTPS in production
- Enable Supabase Auth rate limiting

**Don't:**
- Commit `.env.local` to git (add to `.gitignore`)
- Expose service role keys in client-side code
- Disable RLS policies
- Use the same API keys for dev and production

### 9. Monitoring & Maintenance

**Supabase:**
- Monitor database usage in Supabase dashboard
- Set up database backups (automatic in paid plan)
- Review auth logs for suspicious activity

**Polar:**
- Monitor subscription metrics
- Handle failed payments
- Review webhook logs

**Application:**
- Set up error tracking (Sentry, LogRocket, etc.)
- Monitor API usage (Valyu, OpenAI, Daytona)
- Set up uptime monitoring (UptimeRobot, Better Uptime)

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
