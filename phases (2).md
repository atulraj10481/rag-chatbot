# Build Phases

> Target: 6-day build using Antigravity IDE's Agent Manager to parallelize work across frontend, backend, and ingestion agents.

---

## Phase 0: Setup & Scaffolding (Day 0, 2 hours)

**Goal:** One command to bootstrap the entire project.

| Task | Agent | Output |
|------|-------|--------|
| Initialize Next.js 15 + TypeScript + Tailwind | Agent 1 | `npx create-next-app` scaffold |
| Initialize shadcn/ui with slate base | Agent 1 | `components/ui/` library |
| Initialize Supabase project + enable pgvector | Agent 2 | Project URL, anon key, service key |
| Initialize Cloudflare R2 bucket | Agent 2 | S3-compatible credentials |
| Create `.env.local` template | Agent 3 | Documented env vars |
| Create folder structure | Agent 1 | `app/`, `lib/`, `components/`, `types/` |

**Folder Structure:**
```
rag-chatbot/
├── app/
│   ├── (admin)/
│   │   ├── dashboard/
│   │   │   ├── page.tsx           # Admin dashboard
│   │   │   ├── documents/
│   │   │   │   └── page.tsx       # Document manager
│   │   │   ├── queries/
│   │   │   │   └── page.tsx       # Query logs
│   │   │   └── settings/
│   │   │       └── page.tsx       # White-label config
│   │   ├── layout.tsx             # Admin layout with auth
│   │   └── login/
│   │       └── page.tsx           # Admin login
│   ├── api/
│   │   ├── chat/
│   │   │   └── route.ts           # Streaming chat API
│   │   ├── ingest/
│   │   │   ├── pdf/route.ts       # PDF upload + process
│   │   │   ├── notion/route.ts    # Notion sync
│   │   │   └── url/route.ts       # URL scrape + process
│   │   └── v1/
│   │       └── chat/
│   │           └── route.ts       # Headless API
│   ├── chat/
│   │   └── page.tsx               # Standalone chat page
│   └── widget/
│       └── page.tsx               # Embeddable widget (iframe)
├── components/
│   ├── chat/
│   │   ├── chat-interface.tsx     # Main chat UI
│   │   ├── message-list.tsx       # Message rendering
│   │   ├── source-citations.tsx   # Citation component
│   │   └── suggested-questions.tsx
│   └── admin/
│       ├── document-uploader.tsx
│       ├── query-log-table.tsx
│       └── white-label-form.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Browser client
│   │   └── server.ts              # Server client
│   ├── rag/
│   │   ├── graph.ts               # LangGraph RAG workflow
│   │   ├── retriever.ts           # pgvector retriever
│   │   ├── embeddings.ts          # Embedding generation
│   │   └── model-router.ts        # OpenRouter model selection
│   ├── ingestion/
│   │   ├── pdf.ts                 # PDF processing
│   │   ├── notion.ts              # Notion API integration
│   │   └── url.ts                 # URL scraping
│   └── r2/
│       └── client.ts              # Cloudflare R2 client
├── types/
│   └── index.ts                   # Shared TypeScript types
└── scripts/
    └── deploy-template.sh         # One-click deploy script
```

---

## Phase 1: Database & Auth (Day 1, 4 hours)

**Goal:** Working auth + database schema. Admin can log in.

| Hour | Task | Agent |
|------|------|-------|
| 1 | Create Supabase tables + indexes (documents, chats, messages, query_logs, settings) | Agent 2 |
| 2 | Set up Supabase Auth (email/password, magic link) | Agent 2 |
| 3 | Build admin login page + middleware auth guard | Agent 1 |
| 4 | Build admin layout (sidebar navigation) | Agent 1 |

**Key Decisions:**
- Single-tenant schema (no `org_id` — each deployment is isolated)
- Row Level Security (RLS) enabled on all tables
- Admin role only (no end-user auth — chat is public)

---

## Phase 2: Document Ingestion Pipeline (Day 2, 6 hours)

**Goal:** Admin can upload PDFs, connect Notion, and add URLs. Documents are chunked, embedded, and stored.

| Hour | Task | Agent |
|------|------|-------|
| 1 | Build PDF upload API (`/api/ingest/pdf`) — receive file, store in R2, extract text | Agent 3 |
| 2 | Build PDF text extraction + chunking (RecursiveCharacterTextSplitter) | Agent 3 |
| 3 | Build embedding generation + pgvector storage | Agent 3 |
| 4 | Build Notion OAuth connection + page sync API | Agent 2 |
| 5 | Build URL scraper API (`/api/ingest/url`) — Cheerio single-page scrape | Agent 3 |
| 6 | Build admin Document Manager UI (upload, list, delete, sync status) | Agent 1 |

**Chunking Strategy:**
```typescript
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,      // ~250 tokens
  chunkOverlap: 200,    // 20% overlap for context preservation
  separators: ["\n\n", "\n", " ", ""]
});
```

**Embedding Pipeline:**
```
Upload → Extract Text → Split Chunks → Generate Embeddings (text-embedding-3-small)
→ Store in pgvector with metadata {doc_id, doc_name, source_type, page_num, url}
```

---

## Phase 3: RAG Chat Engine (Day 3, 6 hours)

**Goal:** Working chat with retrieval, model routing, streaming, and citations.

| Hour | Task | Agent |
|------|------|-------|
| 1 | Build pgvector retriever function (cosine similarity, top-k=5) | Agent 3 |
| 2 | Build LangGraph RAG workflow (retrieve → route → generate → stream) | Agent 3 |
| 3 | Implement OpenRouter model routing (cheap/standard/premium) | Agent 3 |
| 4 | Build streaming chat API (`/api/chat`) with Vercel AI SDK | Agent 2 |
| 5 | Build chat UI components (messages, input, sources, suggested questions) | Agent 1 |
| 6 | Integrate chat UI with streaming API + source citation display | Agent 1 |

**LangGraph RAG Workflow:**
```
User Query
    ↓
[Embed Query] → [Retrieve Top-5 Chunks from pgvector]
    ↓
[Assess Complexity] → Route to:
    ├─ Simple → google/gemini-2.0-flash-001:floor
    ├─ Standard → meta-llama/llama-4-scout
    └─ Complex → anthropic/claude-sonnet-4
    ↓
[Generate Answer with Context + Sources]
    ↓
Stream Response + Citation Footnotes
    ↓
[Log Query + Answer + Sources + Model Used]
```

**System Prompt Template:**
```
You are a helpful assistant that answers questions based ONLY on the provided context.
If the answer is not in the context, say "I don't have enough information to answer that."
Always cite your sources using [Source: {doc_name}, Page {page_num}].

Context:
{retrieved_chunks}

Question: {user_query}
```

---

## Phase 4: Delivery Models (Day 4, 5 hours)

**Goal:** Three ways to consume the chatbot.

| Hour | Task | Agent |
|------|------|-------|
| 1 | Polish standalone chat page (`/chat`) — full-screen, mobile-responsive | Agent 1 |
| 2 | Build embeddable widget (`/widget`) — minimal UI, no admin chrome | Agent 1 |
| 3 | Build embed script (`embed.js`) — injects iframe as floating bubble | Agent 1 |
| 4 | Build headless API (`/api/v1/chat`) — OpenAI-compatible endpoint | Agent 2 |
| 5 | Write API documentation + CORS configuration | Agent 2 |

**Embeddable Widget Architecture:**
```html
<!-- Customer adds this to their site -->
<script 
  src="https://their-chatbot.vercel.app/embed.js" 
  data-chatbot-id="their-instance"
  data-primary-color="#3b82f6"
  data-welcome-message="Hi! How can I help you today?"
></script>
```

The script injects a floating iframe that loads `/widget` with URL params for theming.

---

## Phase 5: Admin Dashboard & Polish (Day 5, 5 hours)

**Goal:** Production-ready admin experience.

| Hour | Task | Agent |
|------|------|-------|
| 1 | Build Query Logs page (searchable table with filters) | Agent 1 |
| 2 | Build "Unanswered Questions" flagging (low similarity score + no answer) | Agent 2 |
| 3 | Build White-label Config page (logo upload, color picker, welcome msg, name) | Agent 1 |
| 4 | Add loading states, error boundaries, empty states | Agent 1 |
| 5 | Add analytics (query count, top questions, model usage breakdown) | Agent 2 |

---

## Phase 6: Deploy & Demo (Day 6, 4 hours)

**Goal:** Live demo with real company docs.

| Hour | Task | Agent |
|------|------|-------|
| 1 | Create Vercel Deploy Button template (`vercel.json` + deploy script) | Agent 2 |
| 2 | Write deployment README with env var checklist | Agent 2 |
| 3 | Deploy demo instance + ingest real public docs (e.g., Stripe docs, Vercel docs) | Agent 3 |
| 4 | Record demo video / screenshot walkthrough for sales | Agent 1 |

**One-Click Deploy:**
```markdown
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/rag-chatbot&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,OPENROUTER_API_KEY,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET_NAME,R2_ENDPOINT&project-name=rag-chatbot&repository-name=rag-chatbot)
```

---

## Parallel Agent Strategy (Antigravity IDE)

| Agent | Responsibility | Parallel Work |
|-------|---------------|---------------|
| **Agent 1 — Frontend** | All UI components, pages, layouts, styling | Phases 1, 3, 4, 5 |
| **Agent 2 — Backend/API** | API routes, auth, database functions, headless API | Phases 1, 2, 3, 4, 5 |
| **Agent 3 — RAG & Ingestion** | LangGraph, retriever, embeddings, document processing | Phases 2, 3, 6 |

**Workflow:**
1. Spawn all 3 agents with the architecture document
2. Agent 3 starts on database schema (needed by all)
3. Once schema is ready, Agents 1 and 2 work in parallel on UI and API
4. Daily sync via Artifacts to review progress and resolve conflicts

---

## Post-Launch (Ongoing)

| Week | Task |
|------|------|
| 1–2 | Onboard first 3 customers manually to refine process |
| 3–4 | Automate deployment (Terraform/CDK for Vercel + Supabase + R2) |
| 5–8 | Add features: Slack integration, email digest of unanswered questions, analytics API |
| 9–12 | Scale sales: case studies, testimonials, referral program |
