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

## Global Save System (Phase 0.4)

**Problem**: Complex autosave system with timeouts caused reliability issues and conflicts with month filtering functionality.

**Solution**: Implemented global manual save system that persists across month navigation within expenses page.

**Features**:
- **Cross-Month State**: Unsaved changes persist when switching between months
- **Floating Controls**: Add Row and Save buttons stay visible at bottom of page
- **Smart Save Button**: Shows count of unsaved changes, disables when nothing to save
- **Visual Indicators**: Orange dots for unsaved rows, green checkmarks for saved rows
- **Navigation Protection**: Warns user before leaving page with unsaved changes
- **Batch Operations**: Saves all unsaved changes in one operation

**Key Components**:
- `src/components/transactions/simple-editable-table.tsx` - Simplified table without autosave complexity
- Global state management: `globalUnsavedRows`, `globalSavedRows`, `isSaving`
- Navigation protection with `beforeunload` event handler
- Floating controls positioned at bottom-center of viewport

**User Experience**:
1. User can edit transactions across multiple months
2. Save button shows "Save 5 Changes" with count of unsaved rows
3. State persists when switching months (no data loss)
4. Clear visual feedback on what's saved vs unsaved
5. Batch save operation handles all changes at once
6. Browser warns before leaving with unsaved changes

**Benefits**:
- Eliminated complex autosave timing issues
- Month filtering works reliably without race conditions
- Clear user control over when data is saved
- Consistent state management across month navigation
- Much easier to debug and maintain


## Github 
- Never set Claude as co-author
- Never mention Claude in commit notes/descriptions