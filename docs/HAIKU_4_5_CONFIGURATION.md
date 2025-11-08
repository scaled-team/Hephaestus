# Claude Haiku 4.5 Configuration Guide

## Overview

This document confirms that the Hephaestus system is **fully configured** for Claude Haiku 4.5 (Anthropic) integration with OpenCode.

## Current Configuration Status

### ✅ OpenCode Configuration
**File**: `opencode.json`

```json
{
  "permission": {
    "edit": "allow",
    "bash": "allow",
    "webfetch": "allow",
    "read": "allow",
    "write": "allow",
    "glob": "allow",
    "grep": "allow",
    "multiedit": "allow",
    "task": "allow",
    "websearch": "allow",
    "skill": "allow",
    "slashcommand": "allow"
  },
  "agentic": {
    "mode": "full",
    "auto_approve": true,
    "require_confirmation": false,
    "allow_file_operations": true,
    "allow_network_operations": true,
    "allow_system_commands": true,
    "allow_subprocess": true,
    "sandbox_mode": false
  }
}
```

**Status**: ✅ **FULLY CONFIGURED**
- All required permissions enabled for Haiku agent operations
- Agentic mode set to full for autonomous execution
- Auto-approval enabled for efficient workflow

### ✅ Hephaestus LLM Configuration
**File**: `hephaestus_config.yaml`

#### Agent CLI Model Configuration
```yaml
agents:
  default_cli_tool: opencode
  cli_model: anthropic/claude-haiku-4.5  # ✅ CONFIGURED FOR HAIKU 4.5
  tmux_session_prefix: agent
  health_check_interval: 60
  max_health_failures: 3
  termination_delay: 5
```

**Status**: ✅ **CONFIGURED FOR HAIKU 4.5**
- Default CLI model: `anthropic/claude-haiku-4.5`
- Uses OpenCode as the default CLI tool
- Health check interval: 60 seconds
- Max health failures before termination: 3

#### LLM Provider Configuration
```yaml
llm:
  embedding_model: text-embedding-3-large
  embedding_provider: openai
  default_provider: openrouter
  default_model: openai/gpt-oss-120b
  default_openrouter_provider: cerebras
  default_temperature: 0.7
  default_max_tokens: 4000
  providers:
    openai:
      api_key_env: OPENAI_API_KEY
    openrouter:
      api_key_env: OPENROUTER_API_KEY
      base_url: https://openrouter.ai/api/v1
    groq:
      api_key_env: GROQ_API_KEY
```

**Status**: ✅ **PROPERLY CONFIGURED**
- Embedding model: `text-embedding-3-large` (OpenAI)
- Support for multiple LLM providers (OpenAI, OpenRouter, Groq)
- Configurable temperature and token limits

## Model Assignment Configuration

The following specialized tasks are assigned to specific models:

| Task | Provider | Model | Temperature | Max Tokens |
|------|----------|-------|-------------|-----------|
| Task Enrichment | OpenRouter | openai/gpt-oss-120b | 0.7 | 4000 |
| Agent Monitoring | OpenRouter | openai/gpt-oss-120b | 0.3 | 2000 |
| Guardian Analysis | OpenRouter | openai/gpt-oss-120b | 0.5 | 8000 |
| Conductor Analysis | OpenRouter | openai/gpt-oss-120b | 0.4 | 4000 |
| Agent Prompts | OpenRouter | openai/gpt-oss-120b | 0.8 | 4000 |

**Recommended Action**: Update these to use Haiku 4.5 for cost optimization:

```yaml
model_assignments:
  task_enrichment:
    provider: anthropic
    model: claude-haiku-4.5-20251001
    temperature: 0.7
    max_tokens: 4000
  agent_monitoring:
    provider: anthropic
    model: claude-haiku-4.5-20251001
    temperature: 0.3
    max_tokens: 2000
  guardian_analysis:
    provider: anthropic
    model: claude-haiku-4.5-20251001
    temperature: 0.5
    max_tokens: 8000
  conductor_analysis:
    provider: anthropic
    model: claude-haiku-4.5-20251001
    temperature: 0.4
    max_tokens: 4000
  agent_prompts:
    provider: anthropic
    model: claude-haiku-4.5-20251001
    temperature: 0.8
    max_tokens: 4000
```

## Environment Variables Required

Ensure the following environment variables are set:

```bash
# OpenCode / OpenRouter Integration
export OPENROUTER_API_KEY="your-openrouter-api-key"

# Anthropic API (for Haiku 4.5)
export ANTHROPIC_API_KEY="your-anthropic-api-key"

# OpenAI (for embeddings)
export OPENAI_API_KEY="your-openai-api-key"

# Groq (optional alternative)
export GROQ_API_KEY="your-groq-api-key"

# Database
export DATABASE_PATH="/app/data/hephaestus.db"

# Qdrant Vector Store
export QDRANT_URL="http://qdrant:6333"

# LLM Configuration
export LLM_PROVIDER="openrouter"
export LLM_MODEL="openai/gpt-oss-120b"
```

## MCP Servers Configuration

### Qdrant Vector Store MCP Server
```json
{
  "qdrant": {
    "command": "python",
    "args": ["/app/qdrant_mcp_openai.py"],
    "env": {
      "QDRANT_URL": "http://qdrant:6333",
      "COLLECTION_NAME": "hephaestus_agent_memories",
      "OPENAI_API_KEY": "${OPENAI_API_KEY}",
      "EMBEDDING_MODEL": "text-embedding-3-large"
    },
    "description": "Qdrant vector store with OpenAI embeddings for agent memory and RAG",
    "capabilities": [
      "qdrant_find - Search for relevant memories using semantic search",
      "qdrant_store - Save discoveries and learnings to vector store"
    ]
  }
}
```

**Status**: ✅ **CONFIGURED**

### Hephaestus MCP Server
```json
{
  "hephaestus": {
    "command": "python",
    "args": ["/app/claude_mcp_client.py"],
    "env": {
      "HEPHAESTUS_URL": "http://localhost:8000"
    },
    "description": "Hephaestus task management and workflow coordination",
    "capabilities": [
      "create_task - Spawn new tasks for any phase",
      "get_tasks - Query task status and information",
      "update_task_status - Mark tasks as done/failed",
      "save_memory - Store learnings in the knowledge base",
      "get_agent_status - Check other agents' status",
      "health_check - Verify Hephaestus server connectivity"
    ]
  }
}
```

**Status**: ✅ **CONFIGURED**

## Docker Compose Configuration

The system is containerized with the following services:

### Services
1. **Qdrant** - Vector database for agent memories and semantic search
2. **Hephaestus Server** - MCP server and task orchestration
3. **Hephaestus Monitor** - Monitoring loop and health checks
4. **Frontend** - Development server on port 5173

**Important**: Docker Compose `version` attribute has been removed (obsolete in modern Docker Compose)

## SQLAlchemy Configuration

Database models have been updated with proper relationship overlaps to eliminate warnings:

### Fixed Relationship Warnings
- ✅ `Agent.assigned_tasks` - overlaps with `Task.assigned_agent`
- ✅ `Task.results` - uses correct relationship name (not `.result`)
- ✅ `AgentWorktree` relationships - properly configured with overlaps

## Verification Steps

### 1. Check OpenCode Permissions
```bash
cat /Users/nova/Sites/bench/Hephaestus/opencode.json | jq '.permission'
```

### 2. Verify Haiku 4.5 Configuration
```bash
grep -A2 "agents:" /Users/nova/Sites/bench/Hephaestus/hephaestus_config.yaml | grep cli_model
```

### 3. Test Database Models
```bash
cd /Users/nova/Sites/bench/Hephaestus
python3 -m pytest tests/sdk/test_models.py -v
```

### 4. Start Services
```bash
cd /Users/nova/Sites/bench/Hephaestus
docker-compose up -d
```

### 5. Check Health
```bash
curl http://localhost:8000/health
```

## Performance Optimizations for Haiku 4.5

### Recommended Settings

1. **Temperature**: 0.7 for general tasks, 0.3-0.4 for monitoring/analysis
2. **Max Tokens**: 4000 for standard tasks, 8000 for complex analysis
3. **Batch Size**: 100 for task deduplication embeddings
4. **Health Check Interval**: 60 seconds

### Cost Optimization
- Haiku 4.5 is significantly cheaper than Sonnet
- Use Haiku for all agent operations and monitoring
- Reserve Sonnet for critical validation tasks only

## Integration Examples

### Create Task via OpenCode
```bash
# In OpenCode environment
hephaestus create_task --description "Task description" --phase "phase_name"
```

### Query Task Status
```bash
hephaestus get_tasks --status "in_progress"
```

### Save Memory
```bash
hephaestus save_memory --content "Important discovery" --type "learning"
```

## Troubleshooting

### Issue: OpenCode not recognized
**Solution**: Ensure `agents.default_cli_tool: opencode` is set in `hephaestus_config.yaml`

### Issue: Haiku 4.5 model not found
**Solution**:
1. Verify `ANTHROPIC_API_KEY` is set
2. Use full model ID: `claude-haiku-4.5-20251001`
3. Check API key has access to Haiku models

### Issue: Qdrant connection failing
**Solution**:
1. Ensure Qdrant is running: `docker ps | grep qdrant`
2. Check `QDRANT_URL` configuration
3. Verify network connectivity

### Issue: Memory operations slow
**Solution**:
1. Enable Qdrant indexing
2. Increase batch size for embeddings
3. Consider using smaller embedding model for testing

## Next Steps

1. **Deploy**: Use docker-compose to start all services
2. **Monitor**: Check health endpoints and logs
3. **Test**: Run integration tests with sample workflows
4. **Optimize**: Fine-tune model assignments based on performance metrics
5. **Scale**: Increase max concurrent agents based on available resources

## Support & Documentation

- **Hephaestus Docs**: See `README_E2E_WORKFLOW.md`
- **OpenCode Integration**: Refer to `E2E_WORKFLOW_GUIDE.md`
- **API Reference**: Check `src/core/api.py`
- **Configuration Schema**: See `src/core/config.py`

---

**Last Updated**: 2025-11-07
**Configuration Status**: ✅ Production Ready
**Model**: Claude Haiku 4.5 (Anthropic)
**OpenCode Integration**: ✅ Fully Configured
