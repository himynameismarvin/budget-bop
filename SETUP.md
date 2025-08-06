# Budget Bop - Setup Instructions

## Prerequisites
- Node.js 18+ installed
- pnpm installed (`npm install -g pnpm`)
- Git installed

## Step 1: Clone and Install
```bash
git clone https://github.com/himynameismarvin/budget-bop.git
cd budget-bop
pnpm install
```

## Step 2: Create Supabase Project

### 2a. Create Project
1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Sign in with GitHub or create account
4. Fill out project details:
   - **Name:** `budget-bop`
   - **Database Password:** Generate strong password (save it!)
   - **Region:** Choose closest to you
   - **Plan:** Free tier
5. Wait 1-2 minutes for setup

### 2b. Get Credentials
1. Go to **Settings → API** in your Supabase project
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)
   - **service_role key** (starts with `eyJ...`)

### 2c. Setup Database
1. Go to **SQL Editor** in your Supabase dashboard
2. Click "New Query"
3. Copy the entire contents of `scripts/setup-database.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute all commands
6. You should see "Success. No rows returned" - this is normal!

## Step 3: Setup Google OAuth

### 3a. Create Google Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google+ API:
   - Go to **APIs & Services → Library**
   - Search "Google+ API" and enable it

### 3b. Create OAuth Credentials
1. Go to **APIs & Services → Credentials**
2. Click **"Create Credentials" → "OAuth 2.0 Client IDs"**
3. Configure consent screen if prompted
4. Set application type: **Web application**
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://your-domain.vercel.app/api/auth/callback/google` (for production)
6. Save and copy:
   - **Client ID**
   - **Client Secret**

## Step 4: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to **API Keys** section
4. Click **"Create new secret key"**
5. Copy the API key (starts with `sk-...`)

## Step 5: Configure Environment Variables

1. Copy the template:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` with your actual values:
   ```env
   # Supabase (from Step 2b)
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

   # NextAuth.js
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your-random-secret-here

   # Google OAuth (from Step 3b)
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret

   # OpenAI (from Step 4)
   OPENAI_API_KEY=sk-...your-openai-key

   # Development
   NODE_ENV=development
   ```

3. Generate a secure NEXTAUTH_SECRET:
   ```bash
   openssl rand -base64 32
   ```

## Step 6: Run the Application

1. Start the development server:
   ```bash
   pnpm dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Test the full flow:
   - Click "Get Started"
   - Sign in with Google
   - Complete the demographics form
   - Review AI-generated budget categories
   - Access your dashboard

## Troubleshooting

### Common Issues

**1. "Invalid API key" error**
- Check your OpenAI API key is correct and active
- Make sure you have credits available in your OpenAI account

**2. Google OAuth not working**
- Verify redirect URI is exactly: `http://localhost:3000/api/auth/callback/google`
- Check Google OAuth consent screen is configured
- Make sure Google+ API is enabled

**3. Supabase connection issues**
- Verify your Supabase URL and keys are correct
- Check that RLS policies are enabled (run the setup script)
- Make sure your Supabase project is active

**4. Database errors**
- Re-run the `scripts/setup-database.sql` in Supabase SQL Editor
- Check that all tables were created in the Tables section

### Getting Help
- Check the browser console for errors
- Look at the terminal output for server errors
- Verify all environment variables are set correctly

## Next Steps
Once everything is working:
- Test creating categories and viewing the dashboard
- Try the AI category generation with different demographics
- Ready to continue with Phase 0.3 (transaction import)!