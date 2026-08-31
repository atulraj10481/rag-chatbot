export interface Document {
  id: string;
  name: string;
  source_type: 'pdf' | 'notion' | 'url';
  source_url?: string;
  r2_key?: string;
  page_count?: number;
  status: 'pending' | 'processing' | 'ready' | 'error';
  error_message?: string;
  chunk_count: number;
  department_id?: string;
  minimum_role?: string;
  created_at: string;
  updated_at: string;
}

export interface DocumentChunk {
  id: string;
  document_id: string;
  department_id?: string;
  minimum_role?: string;
  content: string;
  metadata: {
    page_num?: number;
    section_title?: string;
    chunk_index: number;
    total_chunks: number;
  };
  similarity?: number;  // Only present in search results
}

export interface ChatSession {
  id: string;
  visitor_id: string;
  visitor_name?: string;
  visitor_email?: string;
  source: 'standalone' | 'widget' | 'api';
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  sources?: SourceCitation[];
  retrieval_chunks?: DocumentChunk[];
  tokens_used?: number;
  latency_ms?: number;
  created_at: string;
}

export interface SourceCitation {
  document_id: string;
  document_name: string;
  content: string;
  page_num?: number;
  similarity: number;
}

export interface QueryLog {
  id: string;
  session_id?: string;
  query: string;
  answer?: string;
  model?: string;
  sources_count: number;
  top_similarity?: number;
  status: 'success' | 'no_results' | 'error' | 'unanswered';
  error_message?: string;
  tokens_input?: number;
  tokens_output?: number;
  cost_estimate?: number;
  latency_ms?: number;
  created_at: string;
}

export interface Profile {
  id: string;
  email?: string;
  role: 'admin' | 'manager' | 'employee';
  department_id?: string;
  departments: string[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  target_resource?: string;
  details?: Record<string, any>;
  created_at: string;
}

export interface Settings {
  id: number;
  chatbot_name: string;
  welcome_message: string;
  primary_color: string;
  logo_url?: string;
  favicon_url?: string;
  suggested_questions: string[];
  model_preference: 'auto' | 'cheap' | 'standard' | 'premium';
  similarity_threshold: number;
  max_chunks: number;
  is_public_chat_enabled?: boolean;
  allowed_domains?: string[];
  created_at: string;
  updated_at: string;
}

export interface NotionConnection {
  id: string;
  workspace_id: string;
  workspace_name?: string;
  access_token: string;
  bot_id?: string;
  synced_pages: string[];
  last_synced_at?: string;
  created_at: string;
}

// OpenRouter specific types
export interface OpenRouterRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface OpenRouterResponse {
  id: string;
  choices: {
    message: { role: string; content: string };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  choices: {
    delta: { content?: string };
    finish_reason: string | null;
  }[];
}
