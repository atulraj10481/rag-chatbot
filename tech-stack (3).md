# Tech Stack

> Finalized based on: Vercel AI Chatbot (base UI + Supabase auth), LangChain Next.js Template (LangGraph RAG), LangChain Supabase Website Chatbot (pgvector integration), and OpenRouter routing docs.

---

## Philosophy

**Zero dev cost, minimal ops cost.** Every tool chosen has a generous free tier. The only recurring cost is OpenRouter API usage, which is pay-per-use and starts at ~$0.10/1M tokens for the cheapest models.

---

## Stack Overview

| Layer | Technology | Free Tier | Purpose |
|-------|-----------|-----------|---------|
| **Framework** | Next.js 15 (App Router) | Vercel Hobby (unlimited) | Full-stack React framework |
| **Language** | TypeScript 5.7 | — | Type safety |
| **Styling** | Tailwind CSS 4 + shadcn/ui | — | Rapid UI development |
| **Database** | Supabase (PostgreSQL 16) | 500MB DB, 2GB egress | Data + Auth + Realtime |
| **Vector DB** | Supabase pgvector | Included in free tier | Semantic search |
| **File Storage** | Cloudflare R2 | 10GB/month | PDF/doc blob storage |
| **LLM Gateway** | OpenRouter | Pay-per-use only | Model routing + failover |
| **Embeddings** | OpenAI text-embedding-3-small | $0.02/1M tokens | 1536-dim vectors |
| **RAG Framework** | LangChain.js + LangGraph | — | Document processing + stateful RAG |
| **Chat Streaming** | Vercel AI SDK (`ai` package) | — | Streaming UI + API helpers |
| **Auth** | Supabase Auth | 50K users/month | Admin-only authentication |
| **Deployment** | Vercel + Supabase + R2 | All free tiers | Hosting + DB + Storage |
| **Dev IDE** | Google Antigravity | Free preview | Agent-driven development |

---

## Detailed Choices & Rationale

### 1. Next.js 15 + App Router

**Why:** The Vercel AI Chatbot (the most popular open-source AI chat UI) is built on this exact stack. It provides:
- Server Components for data fetching
- API Routes for chat streaming
- Edge Runtime for low-latency responses
- Built-in TypeScript support

**Version:** `next@^15.1.0`

**Key packages:**
```bash
npm install next@latest react@latest react-dom@latest
npm install -D typescript @types/react @types/node
```

---

### 2. Tailwind CSS 4 + shadcn/ui

**Why:** shadcn/ui provides accessible, composable components (chat bubbles, dropdowns, file upload) without locking you into a component library. Tailwind 4 has zero-config CSS.

**Setup:**
```bash
npx shadcn@latest init --yes --template next --base-color slate
npx shadcn add button card input textarea avatar badge dialog scroll-area
```

---

### 3. Supabase (PostgreSQL + pgvector + Auth)

**Why:** Replaces the need for separate vector DB (Pinecone/Qdrant) + separate auth (Clerk) + separate realtime. One platform, zero cost.

**Free tier limits:**
- 500MB database
- 2GB bandwidth egress
- 50,000 auth users
- 1GB file storage (we use R2 instead)

**Why not Pinecone/Qdrant?** Supabase pgvector handles 100K+ vectors easily on the free tier. No extra service to manage.

**Why not Clerk?** Supabase Auth is sufficient for admin-only dashboards. Clerk adds $0–$25/month for no benefit in this use case.

---

### 4. Cloudflare R2 (File Storage)

**Why:** S3-compatible, 10GB free tier, zero egress fees. Perfect for storing uploaded PDFs and Notion exports. Supabase Storage free tier is only 1GB and charges egress.

**Setup:** Create a bucket, generate S3-compatible API keys.

---

### 5. OpenRouter (LLM Gateway + Model Routing)

**Why:** One API key, 400+ models, automatic failover, cost optimization. Critical for the deploy-per-customer model where we want to minimize per-deployment costs.

**Model Routing Strategy:**

| Route | Model | Cost | Use Case |
|-------|-------|------|----------|
| **Cheap** | `google/gemini-2.0-flash-001:floor` | ~$0.10/1M tokens | Simple FAQs, greetings, known answers |
| **Standard** | `meta-llama/llama-4-scout` | ~$0.20/1M tokens | General questions, moderate complexity |
| **Premium** | `anthropic/claude-sonnet-4` | ~$3.00/1M tokens | Complex technical docs, multi-step reasoning |
| **Fallback** | `openai/gpt-4.1-mini` | ~$0.40/1M tokens | If primary fails |

**Routing Logic:**
```typescript
// Simple heuristic-based routing
function selectModel(query: string, retrievedChunks: any[]): string {
  const complexityScore = assessComplexity(query, retrievedChunks);
  if (complexityScore < 0.3) return "google/gemini-2.0-flash-001:floor";
  if (complexityScore < 0.7) return "meta-llama/llama-4-scout";
  return "anthropic/claude-sonnet-4";
}
```

**OpenRouter also provides:**
- `:nitro` suffix for speed optimization
- `:floor` suffix for cost optimization
- `models` array for fallback chains
- `max_price` for cost caps

---

### 6. LangChain.js + LangGraph

**Why:** The LangChain Next.js Template demonstrates exactly how to integrate LangGraph with Next.js App Router for stateful RAG agents. LangGraph provides:
- Stateful multi-step RAG workflows
- Conditional edges (route to different models based on query analysis)
- Human-in-the-loop for unanswered questions
- Streaming support

**Key packages:**
```bash
npm install langchain @langchain/core @langchain/community @langchain/openai
npm install @langchain/langgraph
```

**Reference implementations:**
- [LangChain Next.js Template](https://github.com/langchain-ai/langchain-nextjs-template) — LangGraph + Next.js streaming
- [LangChain Supabase Chatbot](https://github.com/langchain-ai/chat-langchain) — pgvector + LangChain RAG

---

### 7. Vercel AI SDK (`ai` package)

**Why:** Handles streaming chat UI, message persistence, and tool calling. Used by the Vercel AI Chatbot template.

**Key packages:**
```bash
npm install ai @ai-sdk/openai @ai-sdk/react
```

**Note:** We use `@ai-sdk/openai` but point the baseURL to OpenRouter (`https://openrouter.ai/api/v1`). This gives us the Vercel AI SDK developer experience with OpenRouter's model access.

---

### 8. Document Ingestion Libraries

| Source | Library | Notes |
|--------|---------|-------|
| **PDF** | `pdf-parse` + LangChain `PDFLoader` | Extract text from uploaded PDFs |
| **Notion** | `@notionhq/client` + LangChain `NotionAPILoader` | OAuth integration, sync pages |
| **URL** | `cheerio` + LangChain `CheerioWebBaseLoader` | Single-page scrape; for crawling use Firecrawl free tier |
| **Chunking** | LangChain `RecursiveCharacterTextSplitter` | chunkSize: 1000, chunkOverlap: 200 |

```bash
npm install pdf-parse cheerio
npm install @notionhq/client
```

---

### 9. Embeddings

**Model:** OpenAI `text-embedding-3-small`
- **Dimensions:** 1536
- **Cost:** $0.02 per 1M tokens
- **Quality:** Excellent for document retrieval
- **Via:** OpenRouter or direct OpenAI API

**Why not free local embeddings?** `nomic-embed-text` via Ollama is free but requires a running server. For deploy-per-customer on Vercel (serverless), we need API-based embeddings. At $0.02/1M tokens, a 100-page PDF costs ~$0.005 to embed — negligible.

---

## Cost Analysis (Per Customer Deployment)

| Service | Free Tier | Typical Usage | Monthly Cost |
|---------|-----------|---------------|--------------|
| Vercel Hobby | Unlimited bandwidth | 1 deployment | $0 |
| Supabase Free | 500MB DB, 2GB egress | 1 project | $0 |
| Cloudflare R2 | 10GB storage | < 1GB docs | $0 |
| OpenRouter | Pay-per-use | 10K queries/mo | $5–$15 |
| OpenAI Embeddings | $0.02/1M tokens | Ingest 50 docs/mo | $0.50 |
| **Total** | | | **~$5–$20/month** |

At $100–$300/month retainer, your margin is **90–98%**.

---

## Alternatives Considered

| Alternative | Why Rejected |
|-------------|-------------|
| Pinecone/Qdrant | Extra service to manage; Supabase pgvector is sufficient |
| Clerk Auth | Adds cost; Supabase Auth covers admin auth |
| AWS S3 | Egress fees; R2 has zero egress |
| Ollama (local LLM) | Requires persistent server; incompatible with Vercel serverless |
| Dify.ai | No-code but not deploy-per-customer; less control |
| Streamlit | Not production-grade for customer-facing apps |
| Firebase | Vendor lock-in; Supabase is open-source PostgreSQL |

---

## Package Versions (Pinned)

```json
{
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "@supabase/auth-helpers-nextjs": "^0.10.0",
    "langchain": "^0.3.0",
    "@langchain/core": "^0.3.0",
    "@langchain/community": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/langgraph": "^0.2.0",
    "ai": "^4.0.0",
    "@ai-sdk/openai": "^1.0.0",
    "@ai-sdk/react": "^1.0.0",
    "openai": "^4.76.0",
    "pdf-parse": "^1.1.1",
    "cheerio": "^1.0.0",
    "@notionhq/client": "^2.2.0",
    "@aws-sdk/client-s3": "^3.700.0",
    "uuid": "^11.0.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/node": "^22.0.0",
    "@types/uuid": "^10.0.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.1.0"
  }
}
```
