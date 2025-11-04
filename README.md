# Code Refactoring Tools

This directory contains automated tools to detect duplicate code and suggest refactoring opportunities.

## Scripts Overview

### 1. `find-duplicate-code.cjs`
Main script that analyzes your codebase for duplicate code patterns.

**Features:**
- Scans TypeScript and Svelte files
- Detects duplicate code blocks (5-20 lines)
- Groups duplicates by pattern type (API calls, async functions, date manipulation, etc.)
- Generates a detailed JSON report

**Usage:**
```bash
node find-duplicate-code.cjs
```

**Output:**
- Console report with top 10 duplication issues
- `duplication-report.json` - Detailed analysis

**Configuration:**
Edit the `config` object in the script to adjust:
- `minLines`: Minimum lines to consider (default: 5)
- `minTokens`: Minimum tokens required (default: 50)
- `blockSizes`: Block sizes to check (default: [5, 10, 15, 20])
- `maxBlocksPerFile`: Limit per file (default: 50)

### 2. `refactor-helper.cjs`
Helper script that reads the duplication report and suggests refactoring strategies.

**Features:**
- Categorizes duplicates by pattern type
- Suggests where to create utility functions
- Generates utility file templates
- Can auto-create skeleton files

**Usage:**
```bash
# View suggestions
node refactor-helper.cjs

# Create utility file templates
node refactor-helper.cjs --create
```

**Output:**
- Refactoring suggestions by pattern
- Utility file templates
- Priority ranking by impact

## Workflow

### Step 1: Analyze
```bash
node find-duplicate-code.cjs
```
Review the console output and identify high-impact patterns.

### Step 2: Generate Suggestions
```bash
node refactor-helper.cjs
```
Review suggested refactoring locations and strategies.

### Step 3: Refactor
For each high-priority duplicate:
1. Review the code in its original locations
2. Identify what varies between occurrences (parameters)
3. Extract to utility function
4. Replace all occurrences with function call
5. Add tests for the new utility

### Step 4: Verify
```bash
# Run analysis again
node find-duplicate-code.cjs

# Check for improvement
# Compare total duplicated lines with previous run
```

### Step 5: Test
```bash
npm run check
npm run test
npm run build
```

## Best Practices

### When to Refactor
✅ **DO refactor when:**
- Pattern appears 3+ times
- Code block is 10+ lines
- Logic is non-trivial
- Changes would affect multiple locations

❌ **DON'T refactor when:**
- Duplication is in configuration/types
- Code is already clear and simple
- Extraction would reduce readability
- Pattern is intentionally different

### Refactoring Guidelines

1. **Extract incrementally**
   - Start with highest impact patterns
   - One pattern at a time
   - Test after each extraction

2. **Name clearly**
   - Use descriptive function names
   - Follow project conventions
   - Add JSDoc comments

3. **Maintain context**
   - Keep related utilities together
   - Use appropriate file locations
   - Update imports across codebase

4. **Test thoroughly**
   - Add unit tests for utilities
   - Run existing tests
   - Verify behavior unchanged

## Continuous Improvement

Run these scripts periodically:
- After major feature additions
- During refactoring sprints
- Before major releases

Track metrics over time:
- Number of duplicate patterns
- Total duplicated lines
- Code complexity reduction

## Notes

- Scripts use CommonJS (`.cjs`) to avoid ES module conflicts
- Memory limit: 4GB (`--max-old-space-size=4096`)
- Excludes: node_modules, .svelte-kit, dist, build, static, stories
- Focuses on src/ directory only

## Troubleshooting

### Out of Memory
```bash
# Increase memory limit
node --max-old-space-size=8192 find-duplicate-code.cjs

# Or reduce maxBlocksPerFile in config
```

### False Positives
Some duplicates are intentional (interfaces, types). Review manually before refactoring.

### No Report Generated
Check for errors in console output. Ensure src/ directory exists and contains analyzable files.
