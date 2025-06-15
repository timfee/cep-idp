#!/bin/bash

echo "🚀 Starting automated refactor..."

# Make scripts executable
chmod +x scripts/*.js

# 1. Generate request schemas
echo "📝 Generating request schemas..."

# 2. Convert endpoints
echo "🔄 Converting endpoints to use factory..."
node scripts/convert-endpoints.js

# 3. Add step wrapper
echo "🎁 Adding step handler wrapper..."
node scripts/add-step-wrapper.js

# 4. Fix imports in endpoint files (macOS compatible)
echo "🔧 Fixing imports..."
find app/lib/workflow/endpoints -name "*.ts" -not -name "index.ts" -not -name "factory.ts" -not -name "utils.ts" | while read file; do
  # Add import for createEndpoint if not present
  if ! grep -q "import { createEndpoint }" "$file"; then
    # Use printf for macOS compatibility
    printf '%s\n' "import { createEndpoint } from \"../factory\";" "$(cat "$file")" > "$file"
  fi
  
  # Remove old imports (macOS compatible)
  sed -i '' '/import.*callEndpoint.*from.*utils/d' "$file"
  sed -i '' '/import.*ApiContext.*from.*utils/d' "$file"
done

# 5. Update test fixtures to remove _metadata
echo "🧪 Cleaning test fixtures..."
if command -v jq &> /dev/null; then
  find __tests__/fixtures -name "*.json" | while read file; do
    jq 'del(._metadata)' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
  done
else
  echo "⚠️  jq not installed, skipping fixture cleanup. Install with: brew install jq"
fi

node scripts/fix-body-schemas.js


# 6. Run TypeScript check
echo "✅ Running TypeScript check..."
pnpm check


echo "✨ Refactor complete!"
echo ""
echo "📋 Manual tasks remaining:"
echo "   1. Update POST/PUT/PATCH endpoints to use proper body schemas"
echo "   2. Convert step handlers to use defineStepHandler wrapper"
echo "   3. Run: pnpm test"