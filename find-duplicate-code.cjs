#!/usr/bin/env node

/**
 * Script to find duplicate code patterns and suggest refactoring opportunities
 * Analyzes TypeScript and Svelte files for code duplication
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Configuration
const config = {
  minLines: 5, // Minimum lines to consider as duplicate
  minTokens: 50, // Minimum tokens to consider
  blockSizes: [5, 10, 15, 20], // Specific block sizes to check
  maxBlocksPerFile: 50, // Limit blocks per file
  extensions: ['.ts', '.svelte', '.js'],
  excludeDirs: ['node_modules', '.svelte-kit', 'dist', 'build', '.git', 'static', 'stories'],
  srcDir: './src'
};

// Results storage
const results = {
  duplicates: [],
  patterns: new Map(),
  files: []
};

/**
 * Hash a code block for comparison
 */
function hashCode(code) {
  // Normalize code: remove whitespace, comments
  const normalized = code
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  return crypto.createHash('md5').update(normalized).digest('hex');
}

/**
 * Extract code blocks from a file
 */
function extractCodeBlocks(content, filePath) {
  const lines = content.split('\n');
  const blocks = [];
  let blockCount = 0;

  // Only check specific block sizes to reduce memory usage
  for (const size of config.blockSizes) {
    if (blockCount >= config.maxBlocksPerFile) break;

    for (let i = 0; i < lines.length - size; i++) {
      if (blockCount >= config.maxBlocksPerFile) break;

      const block = lines.slice(i, i + size).join('\n');
      const trimmed = block.trim();

      // Skip if too short or mostly empty
      if (trimmed.length < 100) continue;

      // Count tokens (rough estimate)
      const tokens = trimmed.split(/\s+/).length;
      if (tokens < config.minTokens) continue;

      // Skip if it's mostly comments or imports
      const codeLines = trimmed.split('\n').filter(l =>
        !l.trim().startsWith('//') &&
        !l.trim().startsWith('*') &&
        !l.trim().startsWith('import ')
      ).length;
      if (codeLines < size * 0.5) continue;

      blocks.push({
        code: trimmed,
        hash: hashCode(trimmed),
        file: filePath,
        startLine: i + 1,
        endLine: i + size,
        lines: size,
        tokens: tokens
      });

      blockCount++;
    }
  }

  return blocks;
}

/**
 * Recursively find all source files
 */
function findSourceFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      if (!config.excludeDirs.includes(file)) {
        findSourceFiles(filePath, fileList);
      }
    } else {
      const ext = path.extname(file);
      if (config.extensions.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Analyze files for duplicates
 */
function analyzeDuplicates() {
  console.log('🔍 Scanning for source files...\n');

  const files = findSourceFiles(config.srcDir);
  console.log(`Found ${files.length} files to analyze\n`);

  // Extract all code blocks
  console.log('📝 Extracting code blocks...\n');
  const allBlocks = [];

  files.forEach((file, index) => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const blocks = extractCodeBlocks(content, file);
      allBlocks.push(...blocks);

      if ((index + 1) % 10 === 0) {
        process.stdout.write(`Processed ${index + 1}/${files.length} files\r`);
      }
    } catch (err) {
      console.error(`Error reading ${file}:`, err.message);
    }
  });

  console.log(`\nExtracted ${allBlocks.length} code blocks\n`);

  // Group by hash to find duplicates
  console.log('🔎 Finding duplicates...\n');
  const hashGroups = new Map();

  allBlocks.forEach(block => {
    if (!hashGroups.has(block.hash)) {
      hashGroups.set(block.hash, []);
    }
    hashGroups.get(block.hash).push(block);
  });

  // Filter groups with duplicates
  const duplicates = [];
  hashGroups.forEach((group, hash) => {
    if (group.length > 1) {
      // Check if blocks are from different files or different locations
      const uniqueLocations = new Set(
        group.map(b => `${b.file}:${b.startLine}`)
      );

      if (uniqueLocations.size > 1) {
        duplicates.push({
          hash,
          count: group.length,
          locations: group,
          lines: group[0].lines,
          tokens: group[0].tokens,
          code: group[0].code.substring(0, 200) // Preview
        });
      }
    }
  });

  // Sort by impact (count * lines)
  duplicates.sort((a, b) => (b.count * b.lines) - (a.count * a.lines));

  return duplicates;
}

/**
 * Find common patterns (functions that could be extracted)
 */
function findCommonPatterns(duplicates) {
  console.log('🎯 Analyzing patterns for refactoring opportunities...\n');

  const patterns = [];

  duplicates.forEach(dup => {
    const code = dup.locations[0].code;

    // Detect common patterns
    let pattern = {
      type: 'unknown',
      suggestion: '',
      impact: dup.count * dup.lines
    };

    if (code.match(/async\s+function|async\s+\(/)) {
      pattern.type = 'async-function';
      pattern.suggestion = 'Extract to async utility function';
    } else if (code.match(/\bfetch\(|http_api_get|http_api_post/)) {
      pattern.type = 'api-call';
      pattern.suggestion = 'Extract to API service method';
    } else if (code.match(/\$effect\(|\$derived/)) {
      pattern.type = 'svelte-reactive';
      pattern.suggestion = 'Extract to reusable Svelte store or composition';
    } else if (code.match(/console\.(log|error|warn)/)) {
      pattern.type = 'logging';
      pattern.suggestion = 'Use centralized logger utility';
    } else if (code.match(/new Date\(|\.toISOString|\.toLocaleDateString/)) {
      pattern.type = 'date-manipulation';
      pattern.suggestion = 'Extract to date utility function';
    } else if (code.match(/\.map\(|\.filter\(|\.reduce\(/)) {
      pattern.type = 'array-processing';
      pattern.suggestion = 'Extract to data processing utility';
    } else if (code.match(/if\s*\(.*\)\s*\{[\s\S]*\}\s*else/)) {
      pattern.type = 'conditional-logic';
      pattern.suggestion = 'Extract to named function for clarity';
    } else {
      pattern.suggestion = 'Consider extracting to utility function';
    }

    patterns.push({
      ...dup,
      pattern
    });
  });

  return patterns;
}

/**
 * Generate report
 */
function generateReport(duplicates) {
  console.log('\n' + '='.repeat(80));
  console.log('📊 DUPLICATE CODE ANALYSIS REPORT');
  console.log('='.repeat(80) + '\n');

  if (duplicates.length === 0) {
    console.log('✅ No significant code duplication found!\n');
    return;
  }

  console.log(`Found ${duplicates.length} duplicate code patterns\n`);

  // Summary statistics
  const totalLines = duplicates.reduce((sum, dup) => sum + (dup.count * dup.lines), 0);
  const avgDuplication = (totalLines / duplicates.length).toFixed(1);

  console.log('📈 Summary:');
  console.log(`   Total duplicated lines: ${totalLines}`);
  console.log(`   Average duplication per pattern: ${avgDuplication} lines`);
  console.log(`   Potential lines to reduce: ${totalLines - duplicates.length * 5}\n`);

  // Top duplicates
  console.log('🔝 Top 10 Duplication Issues (by impact):\n');

  duplicates.slice(0, 10).forEach((dup, index) => {
    console.log(`${index + 1}. ${dup.pattern.type.toUpperCase()}`);
    console.log(`   Impact: ${dup.count} occurrences × ${dup.lines} lines = ${dup.count * dup.lines} total lines`);
    console.log(`   Suggestion: ${dup.pattern.suggestion}`);
    console.log(`   Locations:`);

    dup.locations.forEach(loc => {
      const relPath = loc.file.replace('./src/', '');
      console.log(`     - ${relPath}:${loc.startLine}-${loc.endLine}`);
    });

    console.log(`   Code preview:`);
    console.log(`     ${dup.code.substring(0, 150).replace(/\n/g, '\n     ')}...`);
    console.log('');
  });

  // Pattern summary
  console.log('🎯 Refactoring Priorities by Pattern:\n');

  const patternGroups = new Map();
  duplicates.forEach(dup => {
    const type = dup.pattern.type;
    if (!patternGroups.has(type)) {
      patternGroups.set(type, { count: 0, impact: 0 });
    }
    const group = patternGroups.get(type);
    group.count++;
    group.impact += dup.pattern.impact;
  });

  const sortedPatterns = Array.from(patternGroups.entries())
    .sort((a, b) => b[1].impact - a[1].impact);

  sortedPatterns.forEach(([type, stats]) => {
    console.log(`   ${type}: ${stats.count} patterns, ${stats.impact} line impact`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('💡 Next Steps:');
  console.log('   1. Review the top duplicates above');
  console.log('   2. Create utility functions in src/lib/utils/');
  console.log('   3. Extract common patterns to reusable modules');
  console.log('   4. Run this script again to verify improvements');
  console.log('='.repeat(80) + '\n');

  // Save detailed report to file
  const reportPath = './duplication-report.json';
  fs.writeFileSync(reportPath, JSON.stringify({
    summary: {
      totalPatterns: duplicates.length,
      totalLines,
      avgDuplication
    },
    duplicates: duplicates.map(dup => ({
      type: dup.pattern.type,
      suggestion: dup.pattern.suggestion,
      impact: dup.pattern.impact,
      count: dup.count,
      lines: dup.lines,
      locations: dup.locations.map(loc => ({
        file: loc.file,
        startLine: loc.startLine,
        endLine: loc.endLine
      })),
      code: dup.code
    }))
  }, null, 2));

  console.log(`📄 Detailed report saved to: ${reportPath}\n`);
}

/**
 * Main execution
 */
function main() {
  console.log('🚀 Starting duplicate code analysis...\n');

  try {
    const duplicates = analyzeDuplicates();
    const patterns = findCommonPatterns(duplicates);
    generateReport(patterns);
  } catch (err) {
    console.error('❌ Error during analysis:', err);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

module.exports = { analyzeDuplicates, findCommonPatterns, generateReport };
