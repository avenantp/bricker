#!/bin/bash

# =====================================================
# Find All References to Old Audit Column Names
# =====================================================
# Run this script to find all code that needs updating
# after running the audit columns migration
# =====================================================

echo "=========================================="
echo "Searching for OLD audit column references"
echo "=========================================="
echo ""

echo "1. Searching for 'added_at' in TypeScript/JavaScript files..."
echo "-----------------------------------------------------------"
grep -rn "added_at" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  frontend/ backend/ || echo "No matches found"

echo ""
echo "2. Searching for 'added_by' in TypeScript/JavaScript files..."
echo "-----------------------------------------------------------"
grep -rn "added_by" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  frontend/ backend/ || echo "No matches found"

echo ""
echo "3. Searching for 'addedAt' (camelCase) in TypeScript/JavaScript files..."
echo "-----------------------------------------------------------------------"
grep -rn "addedAt" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  frontend/ backend/ || echo "No matches found"

echo ""
echo "4. Searching for 'addedBy' (camelCase) in TypeScript/JavaScript files..."
echo "-----------------------------------------------------------------------"
grep -rn "addedBy" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=build \
  frontend/ backend/ || echo "No matches found"

echo ""
echo "5. Searching in SQL migration files..."
echo "------------------------------------"
grep -rn "added_at\|added_by" \
  --include="*.sql" \
  backend/migrations/ || echo "No matches found"

echo ""
echo "6. Searching in Supabase migration files..."
echo "------------------------------------"
grep -rn "added_at\|added_by" \
  --include="*.sql" \
  supabase/migrations/ 2>/dev/null || echo "No supabase migrations found or no matches"

echo ""
echo "=========================================="
echo "Search complete!"
echo "=========================================="
echo ""
echo "Files to update after migration:"
echo "- Any files listed above"
echo "- Replace 'added_at' with 'created_at'"
echo "- Replace 'added_by' with 'created_by'"
echo "- Replace 'addedAt' with 'createdAt'"
echo "- Replace 'addedBy' with 'createdBy'"
echo ""
