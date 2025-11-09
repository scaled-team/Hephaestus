# OpenCode Configuration Deep Review - Issues Found ⚠️

**Date**: November 8, 2025
**Review Status**: ⚠️ **CRITICAL ISSUES FOUND**

---

## 🔴 Critical Issues Found

### Issue 1: Incorrect Model ID Format

**Problem**:
- Our config uses: `claude-sonnet-4-20250514`
- Correct API format: `claude-sonnet-4-5`

The format `claude-sonnet-4-20250514` is NOT a valid Anthropic API model ID. The correct identifier is simply `claude-sonnet-4-5`.

**Impact**: OpenCode commands will fail because the model doesn't exist in that format.

**Evidence**:
- Anthropic API documentation: Model ID is `claude-sonnet-4-5`
- OpenRouter format: `anthropic/claude-sonnet-4.5`
- Anthropic official docs confirm: `claude-sonnet-4-5`

---

### Issue 2: Inconsistent Model Names in Different Files

**Current State**:
- `/Users/nova/Sites/bench/Hephaestus/opencode.json`: `anthropic/claude-sonnet-4-20250514` ❌
- `/Users/nova/Sites/bench/Hephaestus/.env`: `anthropic/claude-sonnet-4.5` ✓ (Using dots instead of dashes)
- Should be: `anthropic/claude-sonnet-4-5` (dashes, not dots)

**The .env file is closer to correct** but uses dot notation instead of dashes.

---

### Issue 3: Small Model is Also Incorrect

**Current Config**:
```json
"small_model": "anthropic/claude-3-5-sonnet-20241022"
```

**Issues**:
1. Model ID format is wrong (includes date: `-20241022`)
2. This refers to an older Claude 3.5 Sonnet, not 4.5
3. Correct small model should be: `anthropic/claude-haiku-4-5`

---

## ✅ What's Correct

**Good news:**
- ✅ JSON structure is valid
- ✅ Permissions are properly configured
- ✅ MCP settings look correct
- ✅ API key environment variable syntax is correct: `${OPENAI_API_KEY}`
- ✅ QDRANT and Hephaestus MCP configs are valid

---

## 📋 Anthropic Model IDs - Current as of November 2025

| Model | API Format | Usage |
|-------|-----------|-------|
| Claude Sonnet 4.5 | `claude-sonnet-4-5` | Primary (Latest, Best for Coding) |
| Claude Haiku 4.5 | `claude-haiku-4-5` | Small/Fast Model |
| Claude Opus 4.1 | `claude-opus-4-1` | Complex Reasoning |

**Key Points**:
- Use dashes, not dots: `claude-sonnet-4-5` not `claude-sonnet-4.5`
- Do NOT include date suffixes in the primary model ID
- Date suffixes (like `-20250514`) are optional for specifying exact versions but NOT recommended for the primary model reference

---

## 🔍 OpenCode/Crush Format

Based on OpenCode documentation:
```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5"
}
```

Or with provider format:
```json
{
  "provider": "anthropic",
  "model": "claude-sonnet-4-5",
  "small_model": "claude-haiku-4-5"
}
```

---

## ❌ Current Errors

1. **Model**: `anthropic/claude-sonnet-4-20250514` → Should be `anthropic/claude-sonnet-4-5`
2. **Small Model**: `anthropic/claude-3-5-sonnet-20241022` → Should be `anthropic/claude-haiku-4-5`
3. **Inconsistency**: `.env` file has `anthropic/claude-sonnet-4.5` (dots instead of dashes)

---

## 📋 Required Fixes

### Fix #1: opencode.json
```json
// BEFORE
"model": "anthropic/claude-sonnet-4-20250514",
"small_model": "anthropic/claude-3-5-sonnet-20241022",

// AFTER
"model": "anthropic/claude-sonnet-4-5",
"small_model": "anthropic/claude-haiku-4-5",
```

### Fix #2: .env file
```bash
# BEFORE
CLI_MODEL=anthropic/claude-sonnet-4.5  # Note: using dots

# AFTER
CLI_MODEL=anthropic/claude-sonnet-4-5  # Use dashes consistently
```

---

## 📊 Summary

| Item | Status | Issue |
|------|--------|-------|
| JSON Format | ✅ Valid | - |
| Model ID | ❌ Wrong | Uses date suffix format |
| Small Model | ❌ Wrong | Uses old Claude 3.5 instead of Haiku 4.5 |
| API Key Syntax | ✅ Correct | Uses `${OPENAI_API_KEY}` |
| Permissions | ✅ Correct | All enabled |
| MCP Config | ✅ Correct | QDRANT and Hephaestus set up |
| Consistency | ❌ Inconsistent | .env and opencode.json differ |

---

## 🎯 Recommendations

### Priority 1 (Critical)
- [ ] Fix model ID: `anthropic/claude-sonnet-4-20250514` → `anthropic/claude-sonnet-4-5`
- [ ] Fix small_model: `anthropic/claude-3-5-sonnet-20241022` → `anthropic/claude-haiku-4-5`

### Priority 2 (Important)
- [ ] Update .env to use dashes: `anthropic/claude-sonnet-4-5` (not dots)
- [ ] Ensure consistency across all config files

### Priority 3 (Optional)
- [ ] Consider using `anthropic/claude-sonnet-4-5-20250929` for pinned version (if needed)
- [ ] Document the model selection rationale

---

## ✨ After Fixes

Once corrected, the config will:
- ✅ Use the latest Claude Sonnet 4.5 model
- ✅ Use Claude Haiku 4.5 for fast operations
- ✅ Have proper model ID format for Anthropic API
- ✅ Be consistent across all configuration files
- ✅ Work correctly with OpenCode commands

---

**Status**: ⚠️ READY FOR FIXES
**Action Required**: YES
**Estimated Fix Time**: 5 minutes
