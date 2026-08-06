# Setup Guide: Cloudflare R2 & Supabase Admin Credentials

This guide provides step-by-step instructions for:
1. Setting up Cloudflare R2 Object Storage for PDF file uploads.
2. Creating Admin User Credentials in Supabase for logging into the Admin Dashboard (`/login`).

---

## Part 1: Cloudflare R2 Setup Guide

Cloudflare R2 provides 10GB/month of free S3-compatible object storage with **zero egress fees**.

### Step 1: Create an R2 Bucket
1. Log in to your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. In the left navigation sidebar, click **R2 Object Storage**.
3. If prompted, enable R2 (no charges will occur within the 10GB free tier).
4. Click **Create bucket**.
5. Set the bucket name to `rag-chatbot-docs` (or your preferred bucket name).
6. Click **Create Bucket**.

### Step 2: Generate S3-Compatible API Credentials
1. In the R2 dashboard, click **Manage R2 API Tokens** on the right side.
2. Click **Create API Token**.
3. Set the Token Name to `rag-chatbot-token`.
4. Under **Permissions**, select **Admin Read & Write**.
5. Under **Apply to specific buckets**, choose **Apply to all buckets** (or select `rag-chatbot-docs`).
6. Click **Create API Token**.
7. Copy the following credentials immediately (they will not be shown again):
   - **Access Key ID** -> `R2_ACCESS_KEY_ID`
   - **Secret Access Key** -> `R2_SECRET_ACCESS_KEY`
   - **Endpoint** (shown under *Use S3 Clients*) -> `R2_ENDPOINT` (Format: `https://<account_id>.r2.cloudflarestorage.com`)

### Step 3: Enable Public Access (For PDF viewing links)
1. Go back to **R2 Object Storage** -> Click your bucket (`rag-chatbot-docs`).
2. Go to the **Settings** tab.
3. Scroll down to **Public Access**.
4. Click **Allow Access** under *R2.dev Subdomain* (or connect a custom domain).
5. Copy the generated Public Bucket URL (e.g., `https://pub-xxxxxxxx.r2.dev`) -> `R2_PUBLIC_URL`.

### Step 4: Configure CORS Policy
1. In your bucket **Settings** tab, scroll down to **CORS Policy**.
2. Click **Add CORS Policy** (or Edit) and paste the following JSON:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600
  }
]
```
3. Click **Save**.

---

## Part 2: Creating Admin Credentials in Supabase

Each single-tenant deployment uses Supabase Auth to protect the Admin Dashboard (`/dashboard`).

### Option A: Create Admin User via Supabase Dashboard UI (Easiest)

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project.
3. In the left sidebar, click **Authentication** -> **Users**.
4. Click the **Add User** button (top right) -> Select **Create User**.
5. Enter the Admin credentials:
   - **Email**: `admin@yourcompany.com` (or your admin email)
   - **Password**: Enter a secure admin password.
   - Check **Auto Confirm User?** (so no email verification step is required).
6. Click **Create User**.

You can now log into your Admin Portal at `http://localhost:3000/login` with this email and password!

---

### Option B: Create Admin User via SQL Editor

If you prefer to create the user programmatically:

1. In Supabase Dashboard, click **SQL Editor**.
2. Click **New Query**.
3. Run the following script (replace `admin@yourcompany.com` and `YourSecurePassword123!`):

```sql
-- Create admin user in auth.users
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@yourcompany.com',
  crypt('YourSecurePassword123!', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);
```
4. Click **Run**.

---

## Part 3: Environment Variable Summary (.env.local)

Make sure your `d:\Dev_Lakshman\rag-chatbot\.env.local` contains all updated credentials:

```bash
# Supabase Credentials (from Supabase Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# OpenRouter (Single API key for LLMs + Embeddings)
OPENROUTER_API_KEY=sk-or-v1-...

# Cloudflare R2 Credentials (from Part 1)
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<your_access_key_id>
R2_SECRET_ACCESS_KEY=<your_secret_access_key>
R2_BUCKET_NAME=rag-chatbot-docs
R2_PUBLIC_URL=https://pub-xxxxxxxx.r2.dev

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
