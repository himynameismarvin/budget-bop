# Database Schema Updates for Enhanced Import System

## Overview
The enhanced import system with vendor normalization and auto-categorization learning requires several new tables and modifications to existing schema.

## New Tables

### 1. `vendor_normalizations`
Stores learned vendor name normalizations and mappings.

```sql
CREATE TABLE vendor_normalizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    confidence DECIMAL(3,2) DEFAULT 0.80 CHECK (confidence >= 0 AND confidence <= 1),
    is_user_defined BOOLEAN DEFAULT true,
    use_count INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(user_id, original_name)
);

-- Indexes for performance
CREATE INDEX idx_vendor_normalizations_user_id ON vendor_normalizations(user_id);
CREATE INDEX idx_vendor_normalizations_original ON vendor_normalizations(user_id, original_name);
CREATE INDEX idx_vendor_normalizations_normalized ON vendor_normalizations(user_id, normalized_name);
```

### 2. `categorization_rules`
Stores learned categorization patterns and rules.

```sql
CREATE TABLE categorization_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL, -- Should match user's category names
    patterns TEXT[] NOT NULL, -- Array of pattern strings
    is_regex BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_user_defined BOOLEAN DEFAULT true,
    confidence DECIMAL(3,2) DEFAULT 0.80 CHECK (confidence >= 0 AND confidence <= 1),
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_categorization_rules_user_id ON categorization_rules(user_id);
CREATE INDEX idx_categorization_rules_category ON categorization_rules(user_id, category);
CREATE INDEX idx_categorization_rules_active ON categorization_rules(user_id, is_active);
```

### 3. `import_sessions`
Track import history and analytics.

```sql
CREATE TABLE import_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_name TEXT,
    file_names TEXT[] DEFAULT '{}', -- Array of uploaded file names
    total_transactions INTEGER DEFAULT 0,
    successful_imports INTEGER DEFAULT 0,
    failed_imports INTEGER DEFAULT 0,
    ai_parsing_success_rate DECIMAL(5,4), -- 0.0000 to 1.0000
    vendor_normalization_count INTEGER DEFAULT 0,
    auto_categorization_count INTEGER DEFAULT 0,
    user_corrections_count INTEGER DEFAULT 0,
    processing_time_seconds INTEGER,
    status TEXT DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'failed', 'cancelled')),
    error_messages TEXT[],
    metadata JSONB DEFAULT '{}', -- Store additional session data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for analytics
CREATE INDEX idx_import_sessions_user_id ON import_sessions(user_id);
CREATE INDEX idx_import_sessions_status ON import_sessions(status);
CREATE INDEX idx_import_sessions_created_at ON import_sessions(created_at);
```

## Modified Tables

### 1. `transactions` table updates
Add new fields to support normalized vendors and import tracking.

```sql
-- Add new columns to existing transactions table
ALTER TABLE transactions 
ADD COLUMN original_vendor TEXT,
ADD COLUMN normalized_vendor TEXT,
ADD COLUMN import_session_id UUID REFERENCES import_sessions(id),
ADD COLUMN ai_confidence DECIMAL(3,2) CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
ADD COLUMN vendor_normalization_applied BOOLEAN DEFAULT false,
ADD COLUMN auto_categorized BOOLEAN DEFAULT false,
ADD COLUMN user_edited BOOLEAN DEFAULT false;

-- Update existing vendor field to be nullable since we now have normalized_vendor
-- ALTER TABLE transactions ALTER COLUMN vendor DROP NOT NULL;

-- Add indexes for new fields
CREATE INDEX idx_transactions_normalized_vendor ON transactions(user_id, normalized_vendor);
CREATE INDEX idx_transactions_import_session ON transactions(import_session_id);
CREATE INDEX idx_transactions_ai_confidence ON transactions(ai_confidence);
```

### 2. `categories` table validation
Ensure categories table can support the enhanced categorization system.

```sql
-- Add index for better performance with categorization
CREATE INDEX IF NOT EXISTS idx_categories_user_name ON categories(user_id, name);

-- Consider adding a category type field for future expansion
ALTER TABLE categories 
ADD COLUMN category_type TEXT DEFAULT 'user_defined' CHECK (category_type IN ('user_defined', 'system', 'suggested'));
```

## Row Level Security (RLS) Policies

### `vendor_normalizations` policies
```sql
-- Enable RLS
ALTER TABLE vendor_normalizations ENABLE ROW LEVEL SECURITY;

-- Users can only see their own normalizations
CREATE POLICY "Users can view own vendor normalizations" ON vendor_normalizations
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own normalizations
CREATE POLICY "Users can insert own vendor normalizations" ON vendor_normalizations
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own normalizations
CREATE POLICY "Users can update own vendor normalizations" ON vendor_normalizations
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own normalizations
CREATE POLICY "Users can delete own vendor normalizations" ON vendor_normalizations
    FOR DELETE USING (auth.uid() = user_id);
```

### `categorization_rules` policies
```sql
-- Enable RLS
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rules
CREATE POLICY "Users can view own categorization rules" ON categorization_rules
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own rules
CREATE POLICY "Users can insert own categorization rules" ON categorization_rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own rules
CREATE POLICY "Users can update own categorization rules" ON categorization_rules
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own rules
CREATE POLICY "Users can delete own categorization rules" ON categorization_rules
    FOR DELETE USING (auth.uid() = user_id);
```

### `import_sessions` policies
```sql
-- Enable RLS
ALTER TABLE import_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own sessions
CREATE POLICY "Users can view own import sessions" ON import_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own sessions
CREATE POLICY "Users can insert own import sessions" ON import_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own sessions
CREATE POLICY "Users can update own import sessions" ON import_sessions
    FOR UPDATE USING (auth.uid() = user_id);
```

## Migration Strategy

### Phase 1: Core Tables
1. Create new tables: `vendor_normalizations`, `categorization_rules`, `import_sessions`
2. Set up RLS policies
3. Create necessary indexes

### Phase 2: Existing Table Updates  
1. Add new columns to `transactions` table
2. Update existing transactions with default values where needed
3. Create new indexes

### Phase 3: Data Migration (if needed)
1. Migrate existing vendor data to populate `original_vendor` and `normalized_vendor`
2. Create initial categorization rules from existing transaction patterns
3. Validate data integrity

## API Integration Notes

### Supabase Client Updates
The frontend will need new API calls for:

1. **Vendor Normalizations**
   - `getVendorNormalizations(userId)` - Load user's normalizations
   - `saveVendorNormalization(normalization)` - Save new normalization
   - `updateVendorNormalization(id, updates)` - Update existing

2. **Categorization Rules**  
   - `getCategorizationRules(userId)` - Load user's rules
   - `saveCategorizationRule(rule)` - Save new rule
   - `updateCategorizationRule(id, updates)` - Update existing

3. **Import Sessions**
   - `createImportSession(sessionData)` - Start new import
   - `updateImportSession(id, updates)` - Update progress
   - `getImportHistory(userId)` - Get user's import history

4. **Enhanced Transactions**
   - Update existing transaction CRUD to handle new fields
   - Batch insert with import session tracking

## Performance Considerations

1. **Indexing Strategy**
   - Composite indexes on user_id + frequently queried fields
   - Partial indexes on active rules only
   - Text search indexes on vendor patterns

2. **Query Optimization**
   - Use prepared statements for bulk operations
   - Batch vendor normalizations and categorizations
   - Implement caching for frequently accessed rules

3. **Storage Optimization**
   - Use JSONB for metadata with appropriate GIN indexes
   - Consider partitioning import_sessions by date if volume is high
   - Regular cleanup of old import sessions (retention policy)

## Analytics and Reporting

The new schema enables powerful analytics:

1. **Import Success Rates** - Track AI parsing accuracy over time
2. **User Learning Patterns** - Monitor how users correct and improve categorizations
3. **Vendor Normalization Effectiveness** - Measure improvement in data quality
4. **System Performance** - Track processing times and bottlenecks

## Security Considerations

1. **Data Privacy** - All user data isolated by RLS policies
2. **Input Validation** - Validate patterns and categories against user's data
3. **Rate Limiting** - Consider limiting import frequency and file sizes
4. **Audit Logging** - Track significant changes to rules and normalizations