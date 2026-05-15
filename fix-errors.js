#!/usr/bin/env node
/**
 * Quick fix script for TypeScript compilation errors
 * Run: node fix-errors.js
 */

const fs = require('fs');
const path = require('path');

// List of file fixes to apply
const fixes = [
  // Fix middleware exports
  {
    file: 'src/middleware/auth.ts',
    search: 'export const requireRole',
    replace: 'export default authMiddleware;\nexport const requireRole'
  },
  // Fix ReputationService typo
  {
    file: 'src/services/ReputationService.ts',
    search: 'reviewsaverage',
    replace: 'reviews.length'
  },
  {
    file: 'src/services/ReputationService.ts',
    search: 'const Evidence',
    replace: ''
  }
];

fixes.forEach(fix => {
  const filePath = path.join(__dirname, fix.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(fix.search, fix.replace);
    fs.writeFileSync(filePath, content);
    console.log(`✓ Fixed: ${fix.file}`);
  }
});

console.log('\nFixes applied. Run: npm run build');
