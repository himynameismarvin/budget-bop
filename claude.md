# Project Memory

## Next.js Development Server Fix

**Problem**: Next.js development server would start successfully but then stop when accessed through command-line tools, causing intermittent connectivity issues.

**Solution**: Start the Next.js development server as a background daemon with explicit host binding:

```bash
HOST=localhost nohup npm run dev > dev.log 2>&1 &
```

**Key Components**:
- `HOST=localhost` - Forces binding to localhost interface 
- `nohup` - Runs process independently of terminal session
- `> dev.log 2>&1 &` - Redirects output to log file and runs in background
- Uses `npm run dev` which runs `next dev -p 3001` (port 3001 configured in package.json)

**Result**: 
- Server accessible at `http://localhost:3001`
- Persistent server that doesn't stop when CLI tools timeout
- Hot reload works properly (edits visible without page refresh)
- Server continues running independently

**Management Commands**:
- `lsof -nP -iTCP:3001 | grep LISTEN` - Check what's listening on port 3001
- `pkill -f "next dev"` - Stop the development server
- `tail -f dev.log` - Monitor server logs

## Import System (Phase 0.3)

**Features Implemented**:
- **Clipboard Import**: Supports TSV, CSV, and HTML table parsing from clipboard
- **Column Mapping**: Visual wizard for mapping data columns to transaction fields
- **Hash Deduplication**: SHA-1 hash-based duplicate detection using date + amount + description
- **Auto-Categorizer**: Vendor regex matching with 50+ default rules and confidence scoring
- **Remember Functionality**: Machine learning from user corrections to improve categorization
- **Transactions Table**: Full CRUD operations with sorting, filtering, search, and statistics

**Usage**:
1. Visit `/import` page from dashboard
2. Copy transaction data (CSV, TSV, or HTML table) to clipboard
3. Click "Import from Clipboard" to parse data
4. Map columns to transaction fields (date, description, amount, etc.)
5. Use AI-powered categorization with learning capability
6. Review and manage transactions in comprehensive table

**Components**:
- `src/components/import/clipboard-import.tsx` - Clipboard parsing interface
- `src/components/import/column-mapper.tsx` - Column mapping wizard
- `src/components/import/remember-categorization.tsx` - AI categorization workflow
- `src/components/transactions/transactions-table.tsx` - Transaction management table
- `src/lib/clipboard-parser.ts` - Multi-format parsing engine
- `src/lib/transaction-hash.ts` - Deduplication system
- `src/lib/auto-categorizer.ts` - AI categorization engine

**Session Persistence**:
- Updated Supabase client with `persistSession: true` and `autoRefreshToken: true`
- Sessions now persist across browser sessions automatically