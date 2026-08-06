# RAG Chatbot over Company Docs 🤖📚

> **Productized Service**: Single-tenant, deploy-per-customer RAG chatbot that answers questions based on internal company documentation with precise source citations.

---

## 💎 Business Model & Pricing

| Item | Specification |
|------|--------------|
| **Target Customer** | SMBs & Mid-Market Companies (20–500 employees) |
| **Pricing Tier** | **$1,000–$5,000 one-time setup fee** + **$100–$300/month retainer** |
| **Operating Cost** | ~$5–$20/month per deployment (OpenRouter + free tiers) |
| **Profit Margin** | **90%+** recurring monthly margin |

---

## ⚡ Quick Start & Deployment Guide (48-Hour Onboarding)

### 1. Database Setup (Supabase)
1. Create a new project on [Supabase](https://supabase.com).
2. Go to **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `supabase/migrations/001_initial_schema.sql` and run the script.
4. Copy your **Project URL**, **Anon Key**, and **Service Role Key** from `Settings -> API`.

### 2. Environment Variables Configuration
Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# OpenRouter (Single API key for LLM + Embeddings)
OPENROUTER_API_KEY=sk-or-v1-...

# Cloudflare R2 (Object Storage for original PDFs)
R2_ENDPOINT=https://xxxx.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=rag-chatbot-docs
R2_PUBLIC_URL=https://pub-xxxx.r2.dev

# Notion Integration (Optional)
NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
NOTION_REDIRECT_URI=http://localhost:3000/api/auth/notion/callback

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Local Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Delivery Models

### Mode 1: Standalone Page
- Accessible at `/chat`
- Full-page chat application for customer subdomains (e.g., `docs.acme.com`).

### Mode 2: Embeddable Floating Widget
Add this single `<script>` tag to any customer website HTML:

```html
<script 
  src="https://your-chatbot-domain.com/embed.js"
  data-primary-color="#3b82f6"
  data-title="Acme Support Assistant"
></script>
```

### Mode 3: Headless API (OpenAI-Compatible)
Endpoint: `POST /api/v1/chat`

```json
{
  "messages": [
    { "role": "user", "content": "What is our remote work policy?" }
  ],
  "stream": true
}
```

---

## 🚀 One-Click Customer Deployment (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/rag-chatbot&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,OPENROUTER_API_KEY,R2_ENDPOINT,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET_NAME,R2_PUBLIC_URL&project-name=rag-chatbot)
