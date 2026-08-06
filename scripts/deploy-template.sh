#!/usr/bin/env bash

# ==============================================================================
# RAG Chatbot - Customer One-Click Deployment Script
# ==============================================================================

set -e

CUSTOMER_NAME=$1

if [ -z "$CUSTOMER_NAME" ]; then
  echo "Error: Customer name required."
  echo "Usage: ./scripts/deploy-template.sh <customer-slug>"
  echo "Example: ./scripts/deploy-template.sh acme-corp"
  exit 1
fi

echo "🚀 Preparing single-tenant deployment for customer: $CUSTOMER_NAME"
echo "----------------------------------------------------------------------"

echo "1. Verify Environment Variables template exists..."
if [ ! -f ".env.example" ]; then
  echo "Error: .env.example file not found!"
  exit 1
fi

echo "2. Vercel One-Click Deploy Link:"
echo "----------------------------------------------------------------------"
echo "https://vercel.com/new/clone?repository-url=https://github.com/your-username/rag-chatbot&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_ROLE_KEY,OPENROUTER_API_KEY,R2_ENDPOINT,R2_ACCESS_KEY_ID,R2_SECRET_ACCESS_KEY,R2_BUCKET_NAME,R2_PUBLIC_URL&project-name=rag-chatbot-${CUSTOMER_NAME}"
echo "----------------------------------------------------------------------"
echo "✅ Deployment template generated successfully!"
