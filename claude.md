# Project Memory

## React Development Server Fix

**Problem**: React development server (`npm start`) was not accessible via `localhost:3001` despite showing successful compilation. Server was binding to IPv6 `[::1]` instead of IPv4 `127.0.0.1`, causing localhost connectivity issues.

**Solution**: Start the React development server with explicit host binding:

```bash
BROWSER=none FAST_REFRESH=true HOST=localhost PORT=3001 npm start
```

**Key Environment Variables**:
- `HOST=localhost` - Forces binding to localhost interface (crucial fix)
- `FAST_REFRESH=true` - Enables hot module replacement without page refreshes
- `BROWSER=none` - Prevents automatic browser opening
- `PORT=3001` - Specifies port (default is 3001 anyway)

**Result**: 
- Server accessible at `http://localhost:3001`
- Hot reload works properly (edits visible without page refresh)
- No loss of scroll position or form state during updates

**Diagnosis Commands**:
- `lsof -nP -iTCP:3001 | grep LISTEN` - Check what's listening on port 3001
- `curl -s -o /dev/null -w "%{http_code}" http://localhost:3001` - Test connectivity

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