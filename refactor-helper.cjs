#!/usr/bin/env node

/**
 * Refactoring Helper
 * Reads duplication report and helps generate utility functions
 */

const fs = require('fs');
const path = require('path');

/**
 * Generate utility function from duplicate code
 */
function generateUtilityFunction(duplicate, index) {
  const { type, code, locations } = duplicate;

  // Generate function name based on pattern
  const functionName = generateFunctionName(type, index);

  // Extract parameters (simple heuristic)
  const params = extractParameters(code);

  // Generate TypeScript function
  let utilityCode = `/**\n * ${duplicate.suggestion}\n`;
  utilityCode += ` * Auto-generated from duplicate code analysis\n`;
  utilityCode += ` * Found in:\n`;
  locations.forEach(loc => {
    utilityCode += ` *   - ${loc.file}:${loc.startLine}\n`;
  });
  utilityCode += ` */\n`;

  if (code.includes('async ')) {
    utilityCode += `export async function ${functionName}(${params.join(', ')})`;
  } else {
    utilityCode += `export function ${functionName}(${params.join(', ')})`;
  }

  utilityCode += ` {\n`;
  utilityCode += `  // TODO: Refactor this code\n`;
  utilityCode += `  // Original code:\n`;
  code.split('\n').forEach(line => {
    utilityCode += `  // ${line}\n`;
  });
  utilityCode += `\n  throw new Error('Not implemented - refactor needed');\n`;
  utilityCode += `}\n\n`;

  return { functionName, code: utilityCode, params };
}

/**
 * Generate function name from pattern type
 */
function generateFunctionName(type, index) {
  const nameMap = {
	  //to define
  };

  const baseName = nameMap[type] || 'utilityFunction';
  return `${baseName}${index + 1}`;
}

/**
 * Extract potential parameters from code
 */
function extractParameters(code) {
  const params = [];

  // Look for variables used but not declared
  const variables = new Set();

  // Find variable usage
  const varPattern = /\b([a-z][a-zA-Z0-9]*)\b/g;
  let match;
  while ((match = varPattern.exec(code)) !== null) {
    if (!['const', 'let', 'var', 'function', 'if', 'else', 'return'].includes(match[1])) {
      variables.add(match[1]);
    }
  }

  // Simple heuristic: take first few unique variables
  return Array.from(variables).slice(0, 3);
}

/**
 * Generate suggestions for each pattern type
 */
function generateRefactoringSuggestions(report) {
  console.log('\n' + '='.repeat(80));
  console.log('🔧 REFACTORING SUGGESTIONS');
  console.log('='.repeat(80) + '\n');

  const byType = new Map();

  report.duplicates.forEach(dup => {
    if (!byType.has(dup.type)) {
      byType.set(dup.type, []);
    }
    byType.get(dup.type).push(dup);
  });

  // Generate suggestions by type
  byType.forEach((dups, type) => {
    console.log(`\n📁 ${type.toUpperCase()}`);
    console.log('-'.repeat(80));

    const targetFile = getTargetUtilityFile(type);
    console.log(`Suggested location: ${targetFile}\n`);

    dups.slice(0, 3).forEach((dup, index) => {
      const { functionName, code, params } = generateUtilityFunction(dup, index);

      console.log(`Function: ${functionName}(${params.join(', ')})`);
      console.log(`Impact: ${dup.impact} lines`);
      console.log(`Occurrences: ${dup.count}`);
      console.log('');
    });
  });

  // Generate utility file templates
  console.log('\n' + '='.repeat(80));
  console.log('📝 UTILITY FILE TEMPLATES');
  console.log('='.repeat(80) + '\n');

  const templates = generateUtilityFileTemplates(report);

  Object.entries(templates).forEach(([filename, content]) => {
    console.log(`\n🗂️  ${filename}`);
    console.log('-'.repeat(80));
    console.log(content.substring(0, 500));
    console.log('...\n');

    // Offer to create the file
    const targetPath = path.join('./src/lib/utils', filename);
    console.log(`💾 Would create: ${targetPath}\n`);
  });
}

/**
 * Get target utility file for pattern type
 */
function getTargetUtilityFile(type) {
  const fileMap = {
    //to define
  };

  return fileMap[type] || 'src/lib/utils/misc-utils.ts';
}

/**
 * Generate utility file templates
 */
function generateUtilityFileTemplates(report) {
  const templates = {};
  const byType = new Map();

  report.duplicates.forEach(dup => {
    if (!byType.has(dup.type)) {
      byType.set(dup.type, []);
    }
    byType.get(dup.type).push(dup);
  });

  byType.forEach((dups, type) => {
    const filename = path.basename(getTargetUtilityFile(type));
    let content = `/**\n * ${type} Utilities\n`;
    content += ` * Auto-generated utility functions to reduce code duplication\n`;
    content += ` * Generated: ${new Date().toISOString()}\n */\n\n`;

    dups.slice(0, 5).forEach((dup, index) => {
      const { code } = generateUtilityFunction(dup, index);
      content += code;
    });

    templates[filename] = content;
  });

  return templates;
}

/**
 * Create utility files
 */
function createUtilityFiles(report, options = { dryRun: true }) {
  const templates = generateUtilityFileTemplates(report);
  const utilsDir = './src/lib/utils';

  // Ensure utils directory exists
  if (!fs.existsSync(utilsDir)) {
    console.log(`📁 Creating directory: ${utilsDir}`);
    if (!options.dryRun) {
      fs.mkdirSync(utilsDir, { recursive: true });
    }
  }

  Object.entries(templates).forEach(([filename, content]) => {
    const targetPath = path.join(utilsDir, filename);

    if (fs.existsSync(targetPath)) {
      console.log(`⚠️  File exists: ${targetPath} (skipping)`);
    } else {
      console.log(`✨ ${options.dryRun ? 'Would create' : 'Creating'}: ${targetPath}`);
      if (!options.dryRun) {
        fs.writeFileSync(targetPath, content, 'utf-8');
      }
    }
  });
}

/**
 * Main execution
 */
function main() {
  const reportPath = './duplication-report.json';

  if (!fs.existsSync(reportPath)) {
    console.error('❌ No duplication report found!');
    console.error('   Run: ./find-duplicate-code.js first\n');
    process.exit(1);
  }

  console.log('📖 Reading duplication report...\n');
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

  console.log(`Found ${report.duplicates.length} duplicate patterns\n`);

  // Generate suggestions
  generateRefactoringSuggestions(report);

  // Ask about creating files
  console.log('\n' + '='.repeat(80));
  console.log('💡 To create utility file templates, run:');
  console.log('   node refactor-helper.js --create');
  console.log('\n   This will create stub files that you can fill in with the actual refactored code.');
  console.log('='.repeat(80) + '\n');

  // Check for --create flag
  if (process.argv.includes('--create')) {
    console.log('\n🏗️  Creating utility files...\n');
    createUtilityFiles(report, { dryRun: false });
    console.log('\n✅ Utility file templates created!\n');
  }
}

if (require.main === module) {
  main();
}

module.exports = { generateRefactoringSuggestions, createUtilityFiles };
