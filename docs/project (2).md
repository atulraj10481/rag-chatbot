# Project: RAG Chatbot over Company Docs

## Overview

A deploy-per-customer RAG (Retrieval-Augmented Generation) chatbot that answers questions based on a company's internal documentation. Built to be sold as a productized service: **$1,000–$5,000 setup + $100–$300/month retainer**.

Each customer gets their own isolated instance (single-tenant) deployed via a one-click template. Zero ongoing development cost. Minimal operating cost limited to AI API usage via OpenRouter.

---

## Business Model

| Item | Details |
|------|---------|
| **Target** | SMBs and mid-market companies (20–500 employees) |
| **Pain** | Support teams drown in repeat questions; onboarding docs are never found; Confluence/Notion search is terrible |
| **Pitch** | "We deploy a trained chatbot on your company docs in 48 hours" |
| **Pricing** | $1,000–$5,000 one-time setup + $100–$300/month retainer |
| **Your cost** | ~$5–$20/month per deployment (OpenRouter + free infra tiers) |
| **Margin** | 90%+ on retainer after month 1 |

---

## Core Value Proposition

1. **Instant Knowledge Access** — Employees and customers get accurate answers in seconds, not minutes of searching.
2. **Source Citations** — Every answer includes clickable references to the original document, building trust.
3. **Zero Maintenance** — Deploy once, auto-ingest new docs, monitor via dashboard.
4. **Three Delivery Modes** — Standalone page, embeddable widget, or headless API.

---

## Key Features (MVP)

### Document Ingestion
- **PDF Upload** — Drag-and-drop PDFs; auto-extract text, chunk, embed, store.
- **Notion Import** — Connect Notion workspace; sync pages and databases.
- **URL Scraper** — Paste a URL; crawl and ingest single pages or entire sites.

### Chat Experience
- **Streaming Responses** — Real-time token streaming for natural feel.
- **Source Citations** — Retrieved chunks shown as footnotes with doc name + page/section.
- **Conversation History** — Persistent threads per user session.
- **Suggested Questions** — Auto-generated follow-ups based on context.

### Admin Dashboard
- **Document Manager** — View, delete, re-ingest documents.
- **Query Logs** — Full history of questions + answers + sources.
- **Unanswered Questions** — Flag queries with low retrieval scores for manual review.
- **White-label Config** — Logo upload, primary color, welcome message, chatbot name.

### Delivery Models
1. **Standalone Chat Page** (`/chat`) — Full-page chat at a custom subdomain.
2. **Embeddable Widget** (`/widget`) — `<script>` tag that injects a floating chat bubble.
3. **Headless API** (`/api/v1/chat`) — REST endpoint for custom frontends.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to first deployment | < 4 hours |
| Setup fee collection | $1,000–$5,000 |
| Monthly retainer | $100–$300 |
| Customer acquisition cost | <$200 (content + outreach) |
| Monthly churn | < 5% |
| Avg. support tickets deflected | 60%+ |

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Hallucinations | Strict system prompt + retrieval-only mode + source citations |
| Data privacy | Deploy-per-customer = complete isolation; no cross-contamination |
| API cost spikes | OpenRouter `:floor` routing + cost caps per deployment |
| Notion API limits | Batch sync with exponential backoff; cache pages locally |

---

## Development Environment

**Primary IDE:** Google Antigravity (agent-first development platform)
- Use Agent Manager to spawn parallel agents for frontend, backend, and ingestion pipeline
- Leverage multi-model support (Gemini 3 Pro for architecture, Claude Sonnet for UI polish)
- Artifacts system for task breakdowns and implementation plans
