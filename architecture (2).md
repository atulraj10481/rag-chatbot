# Architecture

> Deploy-per-customer, single-tenant architecture. Each customer gets an isolated instance: Vercel (frontend) + Supabase (database) + Cloudflare R2 (file storage). Zero shared infrastructure between customers.

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CUSTOMER DEPLOYMENT (Isolated)                     │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Vercel Edge Network                          │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │    │
│  │  │  /chat       │  │  /widget     │  │  /api/*                  │  │    │
│  │  │  Standalone  │  │  Embeddable  │  │  Chat + Ingest + Admin   │  │    │
│  │  │  Chat Page   │  │  Widget      │  │  API Routes              │  │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │    │
│  │         │                 │                      │                  │    │
│  │         └─────────────────┴──────────────────────┘                  │    │
│  │                              │                                       │    │
│  │                    Next.js 15 App Router                             │    │
│  │         ┌────────────────────┼────────────────────┐                  │    │
│  │         ▼                    ▼                    ▼                  │    │
│  │  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐         │    │
│  │  │  React UI   │    │  Vercel AI  │    │  LangGraph RAG  │         │    │
│  │  │  Components │    │  SDK Stream │    │  Agent          │         │    │
│  │  │  (shadcn)   │    │  (ai pkg)   │    │  (State Machine)│         │    │
│  │  └─────────────┘    └─────────────┘    └─────────────────┘         │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Supabase (PostgreSQL)                        │    │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │ documents  │ │doc_chunks  │ │chat_msgs │ │settings  │           │    │
│  │  │ (metadata) │ │(vectors)   │ │(history) │ │(config)  │           │    │
│  │  └────────────┘ └────────────┘ └──────────┘ └──────────┘           │    │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐                        │    │
│  │  │chat_sessions│ │query_logs  │ │notion_conn│                       │    │
│  │  └────────────┘ └────────────┘ └──────────┘                        │    │
│  │                                                                    │    │
│  │  pgvector extension ──► HNSW index ──► Cosine similarity search   │    │
│  │  Supabase Auth ──► Admin email/password + Magic link              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Cloudflare R2 (Object Storage)                  │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │    │
│  │  │  documents/ │  │   logos/    │  │  exports/   │                 │    │
│  │  │  *.pdf      │  │  logo.png   │  │  *.csv      │                 │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                 │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                              │                                               │
│                              ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         External APIs                                │    │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │    │
│  │  │   OpenRouter    │  │    Notion API   │  │  URL Scraper    │     │    │
│  │  │  (LLM Gateway)  │  │  (Page Sync)    │  │  (Cheerio)      │     │    │
│  │  │                 │  │                 │  │                 │     │    │
│  │  │  Model Routing: │  │  OAuth 2.0      │  │  Single-page    │     │    │
│  │  │  ├─ Cheap      │  │  Page fetch     │  │  HTML → text    │     │    │
│  │  │  ├─ Standard   │  │  Block parsing  │  │                 │     │    │
│  │  │  └─ Premium    │  │  Recursive sync │  │                 │     │    │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow: Chat Query

```
User types question
        │
        ▼
┌─────────────────┐
│  1. Frontend    │  React state captures input
│     Capture     │  Vercel AI SDK useChat hook
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. API Route   │  POST /api/chat
│     Handler     │  Edge runtime, streaming response
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Embed Query │  OpenAI text-embedding-3-small
│                 │  1536-dim vector generated
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Retrieve    │  Supabase RPC: match_chunks()
│     Chunks      │  Cosine similarity, top-5, threshold 0.7
│                 │  Returns: content + metadata + similarity
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Route Model │  LangGraph conditional edge
│                 │  Assess complexity → select OpenRouter model:
│                 │  • Simple (score < 0.3) → gemini-flash:floor
│                 │  • Standard (0.3–0.7) → llama-4-scout
│                 │  • Complex (> 0.7) → claude-sonnet-4
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Generate    │  OpenRouter streaming completion
│     Response    │  System prompt: "Answer ONLY from context"
│                 │  Context: retrieved chunks + conversation history
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  7. Stream to   │  Vercel AI SDK streamText()
│     Client      │  SSE stream, token-by-token
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  8. Render      │  React renders message + source citations
│     + Citations │  Clickable [Source: Doc Name, Page 3]
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  9. Log Query   │  Insert into query_logs + chat_messages
│                 │  Store: query, answer, model, sources, tokens, cost, latency
└─────────────────┘
```

---

## Data Flow: Document Ingestion

### PDF Upload

```
Admin drags PDF to upload zone
        │
        ▼
┌─────────────────┐
│  1. Upload to   │  Presigned URL → direct to R2
│     R2          │  Store: documents/{doc_id}/original.pdf
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Extract     │  pdf-parse library
│     Text        │  Extract raw text from all pages
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Chunk       │  RecursiveCharacterTextSplitter
│                 │  chunkSize: 1000, overlap: 200
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Embed       │  Batch embed via OpenAI API
│     (Batch)     │  100 chunks at a time (rate limit friendly)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Store       │  Bulk insert into document_chunks
│     Vectors     │  Each row: content + embedding + metadata
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Update      │  Set documents.status = 'ready'
│     Status      │  Set documents.chunk_count = N
└─────────────────┘
```

### Notion Sync

```
Admin clicks "Connect Notion"
        │
        ▼
┌─────────────────┐
│  1. OAuth       │  Redirect to Notion OAuth
│     Flow        │  Callback: /api/auth/notion/callback
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Store Token │  Encrypt and store in notion_connections
│                 │  access_token (encrypted at rest)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Fetch Pages │  Notion API: search + query pages
│                 │  Recursively fetch child pages
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Parse       │  Convert Notion blocks → plain text
│     Blocks      │  Handle: paragraphs, headings, lists, code
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  5. Chunk +     │  Same pipeline as PDF
│     Embed       │  RecursiveCharacterTextSplitter → embed → store
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Mark Synced │  Update notion_connections.synced_pages
│                 │  Update notion_connections.last_synced_at
└─────────────────┘
```

### URL Scrape

```
Admin pastes URL
        │
        ▼
┌─────────────────┐
│  1. Fetch       │  CheerioWebBaseLoader
│     Page        │  HTTP GET → parse HTML → extract text
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Clean       │  Remove scripts, styles, nav
│     Text        │  Extract main content area
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  3. Chunk +     │  Same pipeline
│     Embed       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Store       │  documents.source_type = 'url'
│                 │  documents.source_url = original URL
└─────────────────┘
```

---

## Deployment Architecture

### Deploy-Per-Customer Model

Each customer = one completely isolated deployment.

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR CONTROL PLANE                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  GitHub     │  │  Deploy     │  │  Customer Registry      │ │
│  │  Repo       │  │  Script     │  │  (Notion/Sheet)         │ │
│  │  (template) │  │  (CLI)      │  │                         │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────────┘ │
│         │                │                                       │
│         └────────────────┘                                       │
│                  │                                               │
└──────────────────┼───────────────────────────────────────────────┘
                   │
    ┌──────────────┼──────────────┬──────────────┐
    ▼              ▼              ▼              ▼
┌────────┐   ┌────────┐   ┌────────┐   ┌────────┐
│Customer│   │Customer│   │Customer│   │Customer│
│   A    │   │   B    │   │   C    │   │   D    │
└───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘
    │            │            │            │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│Vercel  │   │Vercel  │   │Vercel  │   │Vercel  │
│Project │   │Project │   │Project │   │Project │
│(Hobby) │   │(Hobby) │   │(Hobby) │   │(Hobby) │
└───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘
    │            │            │            │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│Supabase│   │Supabase│   │Supabase│   │Supabase│
│Project │   │Project │   │Project │   │Project │
│(Free)  │   │(Free)  │   │(Free)  │   │(Free)  │
└───┬────┘   └───┬────┘   └───┬────┘   └───┬────┘
    │            │            │            │
┌───▼────┐   ┌───▼────┐   ┌───▼────┐   ┌───▼────┐
│R2      │   │R2      │   │R2      │   │R2      │
│Bucket  │   │Bucket  │   │Bucket  │   │Bucket  │
│(Free)  │   │(Free)  │   │(Free)  │   │(Free)  │
└────────┘   └────────┘   └────────┘   └────────┘
```

**Deployment Process (Manual v1):**
1. Fork template repo
2. Create new Vercel project from fork
3. Create new Supabase project
4. Create new R2 bucket
5. Run SQL migrations in Supabase
6. Add env vars to Vercel
7. Deploy

**Deployment Process (Automated v2):**
```bash
# One command per customer
npm run deploy:customer --   --name "acme-corp"   --email "admin@acme.com"   --plan "standard"
```
This script uses Vercel API + Supabase Management API + R2 API to spin up the full stack.

---

## Security Model

### Data Isolation
- **Single-tenant deployments:** Each customer's data lives in their own Supabase project. No risk of cross-contamination.
- **No shared infrastructure:** Vector DB, file storage, and database are completely separate per customer.

### Authentication
- **Admin access:** Supabase Auth with email/password or magic link. RLS policies restrict all admin tables to authenticated users.
- **Chat access:** No authentication required for end users. Anonymous sessions tracked via `visitor_id` (fingerprint + session storage).
- **API access:** Headless API uses optional API key header for rate limiting (not auth).

### API Security
- **Edge runtime:** All API routes run on Vercel Edge for DDoS resilience.
- **Rate limiting:** Implement via Vercel KV or Upstash Redis (free tier):
  - 30 requests/minute per IP (chat)
  - 10 requests/minute per IP (ingestion)
- **Input validation:** Zod schemas on all API inputs.
- **CORS:** Restrict widget embed to customer's domain whitelist (stored in settings).

### Data Protection
- **Encryption at rest:** Supabase encrypts PostgreSQL; R2 encrypts objects.
- **Encryption in transit:** TLS 1.3 for all connections.
- **PII handling:** Chat messages may contain PII. Admin can export/delete all data per GDPR request.
- **Notion tokens:** Encrypted before storage in PostgreSQL.

### Cost Protection
- **OpenRouter cost caps:** Set `max_price` per request; use `:floor` suffix for cost-optimized routing.
- **Token limits:** Max 4096 tokens per response; max 10 chunks retrieved.
- **Alerting:** Query logs track cost per request; admin dashboard shows monthly spend.

---

## Scaling Considerations

### When Free Tiers Are Exceeded

| Service | Free Limit | Paid Upgrade | Cost |
|---------|-----------|--------------|------|
| Vercel | 100GB bandwidth | Pro ($20/mo) | $20/mo |
| Supabase DB | 500MB | Pro ($25/mo) | $25/mo |
| Supabase Auth | 50K users | Included in Pro | — |
| R2 | 10GB storage | $0.015/GB/mo | ~$0.50/mo |
| OpenRouter | Pay-per-use | — | $5–$50/mo |

**Upgrade path:** If a customer outgrows free tiers, they pay for their own infrastructure (pass-through cost), or you upgrade and charge more ($500+/mo enterprise tier).

### Performance Optimizations
- **HNSW index:** pgvector approximate search is O(log n) even at 1M vectors.
- **Edge caching:** Vercel caches static assets globally.
- **Streaming:** First token reaches user in < 500ms (retrieval) + model latency.
- **Connection pooling:** Supabase built-in connection pooler for serverless.

---

## Failure Modes & Recovery

| Failure | Impact | Recovery |
|---------|--------|----------|
| OpenRouter rate limit | Chat temporarily unavailable | Automatic fallback to next model in `models` array |
| Supabase downtime | All DB operations fail | Retry with exponential backoff; show "maintenance" message |
| R2 unavailable | File uploads fail | Queue uploads locally, retry every 30s |
| Embedding API error | New docs can't be ingested | Mark as 'error', notify admin, allow retry |
| No relevant chunks found | Answer may hallucinate | Return "I don't have enough information" + log as 'unanswered' |

---

## Monitoring & Observability

| Layer | Tool | Metric |
|-------|------|--------|
| Application | Vercel Analytics | Page views, Core Web Vitals |
| API | Vercel Logs | Error rates, latency |
| Database | Supabase Dashboard | Query performance, storage |
| LLM | OpenRouter Dashboard | Token usage, cost per model |
| Business | Custom dashboard (in-app) | Query volume, unanswered rate, top questions |

**Key Alerts:**
- Error rate > 5% for 5 minutes
- Average latency > 3 seconds
- Daily cost > $5 (unexpected spike)
- Unanswered rate > 20% (retrieval quality issue)
