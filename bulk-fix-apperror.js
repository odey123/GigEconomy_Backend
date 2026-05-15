#!/usr/bin/env node
/**
 * Bulk fix AppError constructor calls
 * Run: node bulk-fix-apperror.js
 */

const fs = require('fs');
const path = require('path');
const glob = require('glob');

// Pattern to match AppError calls with wrong argument order
const wrongOrderPattern = /throw new AppError\(['"`]([^'"`]+)['"`],\s*(\d+)\)/g;
const correctFormat = "throw new AppError($2, '$1')";

const files = glob.sync('src/**/*.ts', { ignore: 'src/**/*.d.ts' });

let totalFixes = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const matches = content.match(wrongOrderPattern) || [];
  
  if (matches.length > 0) {
    content = content.replace(wrongOrderPattern, (match, message, code) => {
      return `throw new AppError(${code}, '${message}')`;
    });
    fs.writeFileSync(file, content);
    console.log(`✓ ${file}: Fixed ${matches.length} AppError calls`);
    totalFixes += matches.length;
  }
});

console.log(`\n✓ Total AppError fixes: ${totalFixes}`);
console.log('Run: npm run build');
