# Enterprise RAG Chatbot: System Architecture & Technical Specification

> **Document Version:** 2.0  
> **Status:** Production-Ready Architecture  
> **Target Audience:** Technical Architects, Engineering Teams, DevOps, System Administrators, and Product Stakeholders  

---

## Table of Contents
1. [Executive Summary & System Vision](#1-executive-summary--system-vision)
2. [High-Level System Architecture & Data Flow](#2-high-level-system-architecture--data-flow)
3. [Complete Technology Stack & Trade-Off Analysis](#3-complete-technology-stack--trade-off-analysis)
   - [3.1 Web Application Framework](#31-web-application-framework-nextjs-16-app-router)
   - [3.2 Database, Vector Engine & Partitioning](#32-database-vector-engine--partitioning-supabase-postgresql--pgvector)
   - [3.3 RAG Agent Orchestration](#33-rag-agent-orchestration-langgraph--langchain)
   - [3.4 LLM Gateway & Multi-Model Inference](#34-llm-gateway--multi-model-inference-openrouter)
   - [3.5 Vector Embeddings Engine](#35-vector-embeddings-engine-cloudflare-workers-ai--bge-base-en-v15)
   - [3.6 Document Object Storage](#36-document-object-storage-cloudflare-r2)
   - [3.7 UI & Design System](#37-ui--design-system-tailwind-css--glassmorphism)
4. [Role-Based Access Control (RBAC) & Partition Architecture](#4-role-based-access-control-rbac--partition-architecture)
5. [Complete Feature Catalog](#5-complete-feature-catalog)
6. [Functional vs. Technical Requirements](#6-functional-vs-technical-requirements)
   - [6.1 Simple / Business Requirements](#61-simple--business-requirements)
   - [6.2 Technical / Architectural Requirements](#62-technical--architectural-requirements)
7. [Resilience & Edge-Case Protection](#7-resilience--edge-case-protection)
8. [Clarifying Questions & Next Steps](#8-clarifying-questions--next-steps)

---

# 1. Executive Summary & System Vision

The **Enterprise RAG Chatbot** is a deploy-per-customer, single-tenant retrieval-augmented generation platform designed to unlock organizational knowledge while maintaining strict **departmental data segregation** and **hierarchical access control**. 

Traditional RAG solutions ingest all enterprise data into a flat vector pool, exposing sensitive management documents to unauthorized staff. This platform resolves that challenge through **PostgreSQL List-Partitioning** and **Multi-Layer RBAC Enforcement**, ensuring that employees, managers, and administrators can query internal company knowledge safely, accurately, and with full citation traceability.

---

# 2. High-Level System Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client Layer
        Browser[Modern Web Browser / Mobile]
        LoginUI[Unified Login: /login]
        AdminUI[Admin Suite: /dashboard]
        ManagerUI[Manager Portal: /manager]
        EmpUI[Employee Portal: /employee]
    end

    subgraph Application & Gateway Layer (Next.js 16)
        AuthActions[Server Actions: auth.ts / admin.ts]
        APIChat[/api/chat Route Handler]
        APIIngest[/api/ingest Multi-Modal Ingestion]
        CacheLayer[(Semantic Query Cache)]
    end

    subgraph Agentic Orchestration Layer (LangGraph)
        QueryAnalyzer[Query Classification Node]
        Router[Context Routing Node]
        Retriever[Permission-Aware Retriever]
        Generator[LLM Response Generation]
        Evaluator[Faithfulness & Hallucination Guardrail]
    end

    subgraph Data & Storage Tier (Supabase PostgreSQL)
        AuthTable[(auth.users)]
        ProfilesTable[(public.profiles: RBAC)]
        DocMaster[(documents)]
        
        subgraph Physical Partitions (document_chunks)
            P_GEN[(chunks_general)]
            P_MKT[(chunks_marketing)]
            P_FIN[(chunks_finance)]
            P_SAL[(chunks_sales)]
            P_OPS[(chunks_operations)]
            P_HR[(chunks_hr)]
            P_TECH[(chunks_tech)]
            P_ADM[(chunks_admin)]
        end
    end

    subgraph External Cloud Services
        R2[Cloudflare R2 Object Storage]
        CF_AI[Cloudflare Workers AI / Embeddings]
        OpenRouter[OpenRouter Gateway: Claude / GPT-4o / DeepSeek]
    end

    %% Auth & Routing Flows
    Browser --> LoginUI
    LoginUI --> AuthActions
    AuthActions --> AuthTable
    AuthActions --> ProfilesTable
    AuthActions -->|Role: admin| AdminUI
    AuthActions -->|Role: manager| ManagerUI
    AuthActions -->|Role: employee| EmpUI

    %% Chat & Ingestion Flows
    AdminUI --> APIIngest
    APIIngest --> R2
    APIIngest --> CF_AI
    CF_AI --> Physical Partitions

    ManagerUI & EmpUI & AdminUI --> APIChat
    APIChat --> CacheLayer
    APIChat --> QueryAnalyzer
    QueryAnalyzer --> Retriever
    Retriever -->|match_chunks_rbac| Physical Partitions
    Retriever --> Generator
    Generator --> OpenRouter
    Generator --> Evaluator
    Evaluator --> APIChat
```

### Data Flow Lifecycle:
1. **Authentication & Identity Binding:** Users authenticate once at `/login`. Cryptographic sessions establish the user's verified identity, `role`, and `department_id`.
2. **Ingestion & Dynamic Partitioning:** When an administrator uploads a PDF, Notion page, or Website URL, the document is chunked, embedded via `bge-base-en-v1.5`, and routed physically into the selected department's partition table.
3. **Partitioned Retrieval:** When a user asks a question, LangGraph retrieves vectors using `match_chunks_rbac`. PostgreSQL prunes all partition tables that do not match the user's allocated department (unless the user is an Administrator).
4. **Guardrailed Generation:** The retrieved context is passed to the LLM (e.g. Claude 3.5 Sonnet / GPT-4o) via OpenRouter, verified for faithfulness, and streamed with exact source citations back to the user interface.

---

# 3. Complete Technology Stack & Trade-Off Analysis

| Layer | Selected Technology | Alternative Considered | Primary Reasons for Choice |
| :--- | :--- | :--- | :--- |
| **Framework** | **Next.js 16 (App Router + Turbopack)** | Remix / Vite + Express / SPA | Unified full-stack architecture, built-in Server Actions, zero-API-boilerplate security, SSR performance. |
| **Database** | **Supabase PostgreSQL** | AWS RDS / PlanetScale / MongoDB | ACID-compliant relational engine, integrated Auth, Row Level Security, instant extension ecosystem. |
| **Vector Indexing** | **pgvector (HNSW Indexing)** | Pinecone / Milvus / Qdrant | Single database for metadata and vectors; eliminates cross-service data sync; native list-partitioning. |
| **RAG Agent** | **LangGraph / LangChain** | LlamaIndex / Raw Custom Scripts | State-graph orchestration, conditional branching, built-in guardrails, cycles, and multi-step reasoning. |
| **AI Inference** | **OpenRouter** | Direct OpenAI / Anthropic SDKs | Unified multi-model gateway; zero vendor lock-in; instant fallback between Claude, GPT-4o, and DeepSeek. |
| **Embeddings** | **Cloudflare Workers AI (`bge-base-en-v1.5`)** | OpenAI `text-embedding-3-small` | Sub-millisecond latency, cost efficiency, high cosine similarity retrieval benchmarks. |
| **Object Storage** | **Cloudflare R2** | AWS S3 / Google Cloud Storage | Zero egress bandwidth fees, instant S3 API compatibility, global edge replication. |
| **Styling & UI** | **Tailwind CSS + Base UI** | Material UI / Ant Design / Chakra | Ultra-lightweight footprint, deep dark-mode customization, glassmorphism aesthetics, accessible primitives. |

---

### 3.1 Web Application Framework: Next.js 16 (App Router)
- **Role:** Full-stack framework hosting the responsive UI, Server Actions, route handlers, and SSR layouts.
- **Why Chosen:**
  - **Server Actions:** Enables secure database mutations (`createUserAction`, `updateUserAction`, `loginAction`) executed entirely on the server without exposing internal API endpoints.
  - **Turbopack Build Engine:** Delivers sub-second hot module reloading and fast production builds.
  - **Nested Route Groups:** Allows clean separation between unauthenticated public pages (`/login`), department staff portals (`/employee`, `/manager`), and the master control suite (`/dashboard`).
- **Alternatives Considered:**
  - *Vite + React SPA with Express Backend:* Rejected due to high maintenance overhead of two separate repos, CORS configuration, and vulnerability to client-side token leakage.

---

### 3.2 Database, Vector Engine & Partitioning: Supabase PostgreSQL + pgvector
- **Role:** Master relational storage, user profiles, RBAC security, query logging, and partitioned vector storage.
- **Why Chosen:**
  - **Physical List Partitioning:** `document_chunks` is partitioned across 8 enterprise departments (`general`, `marketing`, `finance`, `sales`, `operations`, `hr`, `tech`, `admin`).
  - **Hierarchical HNSW Indexing:** Each partition table maintains its own dedicated HNSW vector index (`vector_cosine_ops`, `m=16`, `ef_construction=64`), providing sub-10ms similarity search speeds.
  - **Relational Integrity:** Eliminates the classic "split-brain" vulnerability where vectors live in an external vector DB while metadata lives in SQL.
- **Alternatives Considered:**
  - *Pinecone / Milvus:* Rejected because external vector stores cannot enforce native SQL foreign key constraints, require costly data replication pipelines, and complicate departmental access isolation.

---

### 3.3 RAG Agent Orchestration: LangGraph + LangChain
- **Role:** Manages the multi-step retrieval, semantic caching, routing, answer synthesis, and verification state graph.
- **Why Chosen:**
  - **Cyclic Graph Support:** Unlike linear DAG pipelines, LangGraph supports feedback loops (e.g. if the evaluator detects an unfaithful answer, it can trigger re-querying or clarification).
  - **Stateful Tracing:** Maintains conversation state, citations, and confidence scores in an immutable graph state.
- **Alternatives Considered:**
  - *LlamaIndex:* Strong for basic document ingestion, but less flexible for complex multi-role state graphs and customized runtime routing.

---

### 3.4 LLM Gateway & Multi-Model Inference: OpenRouter
- **Role:** Single API gateway providing access to state-of-the-art LLMs (Claude 3.5 Sonnet, GPT-4o, DeepSeek V3/R1).
- **Why Chosen:**
  - **Zero Vendor Lock-In:** Allows the application to switch LLM backends dynamically based on cost, speed, or performance without changing application code.
  - **Automated Fallbacks:** Automatically routes traffic to backup models if a specific provider suffers downtime.
- **Alternatives Considered:**
  - *Direct Anthropic / OpenAI APIs:* Rejected due to single-vendor dependency and risk of downtime.

---

### 3.5 Vector Embeddings Engine: Cloudflare Workers AI (`bge-base-en-v1.5`)
- **Role:** Generates 768/1536-dimensional vector embeddings for uploaded document chunks and user queries.
- **Why Chosen:**
  - High semantic similarity accuracy on MTEB retrieval benchmarks.
  - Cloudflare Edge distribution ensures ultra-low embedding generation latency.

---

### 3.6 Document Object Storage: Cloudflare R2
- **Role:** Stores raw original PDF files, uploaded corporate manuals, and exported reports.
- **Why Chosen:**
  - **Zero Egress Fees:** Eliminates unpredictable data transfer costs typical of AWS S3.
  - S3-compatible API integrates seamlessly with standard NodeJS AWS SDK clients.

---

### 3.7 UI & Design System: Tailwind CSS + Glassmorphism + Base UI
- **Role:** Powers the responsive dark-mode user interface, glowing status badges, and interactive modals.
- **Why Chosen:**
  - Zero-runtime CSS generation ensuring peak browser rendering speeds.
  - Custom glassmorphism tokens (`bg-white/3`, `border-white/8`, backdrop blur) create an executive-grade, modern visual aesthetic.

---

# 4. Role-Based Access Control (RBAC) & Partition Architecture

The platform implements **Defense-in-Depth** across three distinct layers:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. ROUTING GUARD LAYER (Next.js Server Layouts)                            │
│    • /dashboard/*   -> Requires Role == 'admin'                             │
│    • /manager/*     -> Requires Role in ('manager', 'admin')                │
│    • /employee/*    -> Requires Authenticated Staff                         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. APPLICATION LEVEL RBAC (API & Server Actions)                           │
│    • Ingestion API tags chunks with department_id and minimum_role          │
│    • Chat API passes verified User Context to LangGraph Engine              │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. STORAGE & SQL PARTITION PRUNING (PostgreSQL Database Layer)              │
│    • Function: match_chunks_rbac(embedding, threshold, dept, role)         │
│    • Partition Pruning: Skips 7 out of 8 partition tables automatically    │
│    • Role Weight Filter: get_role_weight(user) >= get_role_weight(chunk)    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### RBAC Permission Matrix

| Role | Weight | Accessible Routes | Vector Partition Access | Minimum Role Clearance | User Management | Document Ingestion |
| :--- | :---: | :--- | :--- | :--- | :---: | :---: |
| **Admin** | **3** | `/dashboard`, `/dashboard/users`, `/dashboard/documents`, `/dashboard/queries`, `/dashboard/settings` | **Global** (All 8 Partitions) | Admin, Manager, Employee | Full (Create, Edit, Delete) | Full |
| **Manager** | **2** | `/manager` | **Department-Scoped** (e.g. `finance`) | Manager, Employee | Read-Only (Own Dept) | None |
| **Employee** | **1** | `/employee` | **Department-Scoped** (e.g. `finance`) | Employee Only | None | None |

---

# 5. Complete Feature Catalog

### 1. Master Administration Control Suite (`/dashboard`)
- **Real-Time Overview Metrics:** Displays live counts of ingested knowledge sources, active staff, total query volume, and sub-50ms cache hits.
- **Partition Architecture Visualizer:** Live monitor showcasing the health and HNSW status of all 8 PostgreSQL department partitions.
- **Recent Query Log Feed:** Live audit stream of user questions, LLM responses, status indicators, and latency timers.

### 2. Staff & Identity Management (`/dashboard/users`)
- **User Provisioning (`CreateUserModal`):** Admins can create staff accounts with auto-confirmed emails, temporary passwords, explicit role assignment, and mandatory department allocation.
- **User Modification & Department Reassignment (`EditUserModal`):** Instant editing of staff roles, moving employees between department partitions, and manual password resets.
- **Account Deletion Guard:** Securely purges users from Supabase Auth and database profiles, with built-in guardrails preventing Admins from deleting their own active profile.

### 3. Multi-Modal Document Ingestion Suite (`/dashboard/documents`)
- **PDF Upload Engine:** Ingests documents up to 10MB, extracts text, calculates SHA-256 deduplication hashes, generates embeddings, and routes chunks to targeted partitions.
- **Live Web Page Scraper:** Scrapes public documentation URLs, strips boilerplate navigation HTML, and indexes readable body text into pgvector.
- **Notion Workspace Synchronizer:** Direct API/OAuth integration allowing sync of Notion pages directly into vector partitions.
- **Partition & Clearance Targeting:** Explicit dropdowns allowing Admins to designate the target department partition and clearance level before uploading.

### 4. Interactive RAG Chatbot (`<ChatInterface />`)
- **Department-Scoped Knowledge Assistant:** Available across `/employee`, `/manager`, and `/dashboard`.
- **Source Attribution:** Displays exact document names, chunk citations, and page numbers used to generate each response.
- **Interactive Markdown & Code Rendering:** Full support for syntax-highlighted code blocks, tables, and bulleted lists.

### 5. Self-Service Account Controls
- **Universal Header Navigation:** Role badge, department indicator, and user email badge.
- **Change Password Dialog (`ChangePasswordModal`):** Allows any authenticated staff member (Admin, Manager, Employee) to overwrite their temporary password with a private password.
- **Global Logout Button (`LogoutButton`):** Instantly terminates Supabase sessions, purges cookies, and redirects safely to `/login`.

---

# 6. Functional vs. Technical Requirements

### 6.1 Simple / Business Requirements
*(Designed for business stakeholders, HR managers, and department heads)*

1. **Strict Data Privacy:** Finance documents must never be visible to Sales or Marketing staff. Management reviews must only be visible to Managers and Admins.
2. **Zero Setup Friction for Employees:** Staff do not need to register or verify emails. The administrator provisions their ID, gives them a temporary password, and assigns their department.
3. **Accurate, Cited Answers:** Every answer generated by the assistant must cite the exact internal company document and page number.
4. **Self-Service Password Management:** Employees can change their temporary password at any time directly from their dashboard.
5. **Unified Admin View:** Company leadership has a central hub to upload documents, review system usage, and manage team permissions.

---

### 6.2 Technical / Architectural Requirements
*(Designed for software engineers, DevOps, and database administrators)*

```
System Prerequisites:
├── Node.js: >= 18.18.0 (Tested on Node 20+ LTS)
├── Package Manager: npm >= 9.0.0
├── Framework: Next.js 16.2.x (Turbopack Enabled)
└── Database: PostgreSQL 15+ with extensions.vector (pgvector)
```

#### Required Environment Variables (`.env.local`):
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# AI & LLM Inference
OPENROUTER_API_KEY=sk-or-v1-...
DEFAULT_LLM_MODEL=anthropic/claude-3.5-sonnet

# Object Storage (Cloudflare R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=rag-documents
R2_PUBLIC_URL=https://pub-...r2.dev

# Notion Integration (Optional)
NOTION_API_KEY=secret_...
NEXT_PUBLIC_NOTION_CLIENT_ID=...
NOTION_CLIENT_SECRET=...
```

#### Database Requirements & Constraints:
1. **Extensions Required:** `pgvector` (`extensions.vector`).
2. **List Partition Master:** `document_chunks` partitioned by `list (department_id)`.
3. **8 Active Physical Partitions:** `document_chunks_general`, `document_chunks_marketing`, `document_chunks_finance`, `document_chunks_sales`, `document_chunks_operations`, `document_chunks_hr`, `document_chunks_tech`, `document_chunks_admin`.
4. **HNSW Vector Indexes:** 1536-dimension cosine distance indexes with `ef_construction = 64` and `m = 16`.
5. **Security Definer Function:** `public.is_admin()` to prevent infinite recursion during RLS evaluation.

---

# 7. Resilience & Edge-Case Protection

| Vulnerability / Edge Case | System Protection Mechanism |
| :--- | :--- |
| **Session & Cookie Race Conditions** | Server components and actions use `createAdminClient()` for verified user profile reads, bypassing unattached cookie delays. |
| **RLS Policy Infinite Recursion** | Replaced recursive `SELECT FROM profiles` subqueries with a `SECURITY DEFINER` function (`is_admin()`). |
| **Missing User Profile on Login** | Implemented self-healing bootstrap in `loginAction`: automatically creates a profile without overwriting existing roles. |
| **Unpartitioned Chunk Insertion** | Document ingestion endpoints explicitly require and attach `department_id` and `minimum_role` to all chunk inserts. |
| **Accidental Admin Self-Deletion** | `deleteUserAction` enforces a check preventing an Admin from deleting their own active user ID. |
| **Infinite Login Redirect Loops** | Isolated dashboard layouts inside `/dashboard/layout.tsx`, ensuring `/login` is completely standalone and immune to redirect loops. |
| **Hydration Nesting Errors** | Upgraded `@base-ui/react` dialog triggers to use the native `render={<Button />}` prop, eliminating nested `<button>` DOM tags. |

---

# 8. Clarifying Questions & Next Steps

To assist in tailoring this system further for your organization's deployment:

1. **Automated Audit Logging:** Would you like me to add an **Audit Trail** table that logs every administrative action (e.g. who changed which user's department, who deleted which document, timestamp, and IP)?
2. **Custom Embeddable Web Widget:** Would you like to enable the **Embed Script Generator** in `/dashboard/settings` so you can embed the RAG Chatbot as a floating bubble on your internal company intranet or Notion portals?
3. **Automated Document Re-indexing:** Would you like scheduled background cron jobs to automatically re-crawl target URLs or re-sync Notion pages on a daily/weekly basis?
