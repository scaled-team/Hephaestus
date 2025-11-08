# Hephaestus Memory System Guide

## Overview

The Hephaestus memory system uses Qdrant vector database to persist memories, learnings, and context across sessions.

## Memory Collections

Qdrant has 7 collections configured:

| Collection | Purpose | Status |
|-----------|---------|--------|
| `hephaestus_project_context` | Project context and architecture | ✅ Active |
| `hephaestus_task_completions` | Completed tasks and outcomes | ✅ Active |
| `hephaestus_static_docs` | Documentation embeddings | ✅ Active |
| `hephaestus_ticket_embeddings` | Issue and ticket embeddings | ✅ Active |
| `hephaestus_error_solutions` | Error patterns and solutions | ✅ Active |
| `hephaestus_agent_memories` | Agent learnings and discoveries | ✅ Active |
| `hephaestus_domain_knowledge` | Domain-specific knowledge | ✅ Active |

## 🔍 Verifying Memory Storage

### Check Qdrant Collections

```bash
# List all collections
curl http://localhost:6333/collections | python3 -m json.tool

# Check collection details
curl http://localhost:6333/collections/hephaestus_agent_memories | python3 -m json.tool
```

### Check Collection Counts

```bash
# Get point count in a collection
curl -X POST http://localhost:6333/collections/hephaestus_agent_memories/points/count \
  -H "Content-Type: application/json" \
  -d '{}' | python3 -m json.tool
```

### Search Memories

```bash
# Search for memory points
curl -X POST http://localhost:6333/collections/hephaestus_agent_memories/points/search \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, 0.3],
    "limit": 10
  }' | python3 -m json.tool
```

## 📝 Creating Memories via MCP

If the system claims it created memories but they don't exist, you can manually create them using the Qdrant API or the Hephaestus MCP endpoints.

### Via REST API

```bash
# Store a memory in agent_memories collection
curl -X POST http://localhost:8000/api/memory/store \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "hephaestus_agent_memories",
    "memory_type": "learning",
    "content": "Learning from Phase 2 analysis",
    "metadata": {
      "phase": 2,
      "component": "planning",
      "timestamp": "2025-11-07"
    }
  }'
```

### Via Qdrant Direct API

```bash
# Insert points directly into Qdrant
curl -X PUT http://localhost:6333/collections/hephaestus_agent_memories/points \
  -H "Content-Type: application/json" \
  -d '{
    "points": [
      {
        "id": 1,
        "vector": [0.1, 0.2, 0.3, 0.4, 0.5],
        "payload": {
          "type": "learning",
          "content": "Phase 2 analysis completed",
          "phase": 2,
          "timestamp": "2025-11-07"
        }
      }
    ]
  }'
```

## 🐛 Debugging Memory Issues

### Issue: System claims memories created but can't find them

**Possible Causes**:
1. Memory operation succeeded but embedding/indexing failed
2. Collection exists but is empty
3. Memory endpoint not properly connected to Qdrant
4. API response parsing issue (false positive reporting)

**Solutions**:

```bash
# 1. Check if Qdrant is accessible
curl http://localhost:6333/health

# 2. Verify collections exist
curl http://localhost:6333/collections | grep hephaestus

# 3. Check collection stats
curl http://localhost:6333/collections/hephaestus_agent_memories
```

### Issue: Memory endpoints not working

**Check backend logs**:
```bash
docker-compose logs hephaestus-server | grep -i memory
```

**Verify Qdrant URL in config**:
```yaml
vector_store:
  qdrant_url: http://localhost:6333  # Local
  # OR
  qdrant_url: http://qdrant:6333     # Docker
```

## 📊 Memory System Architecture

```
┌─────────────────────────────────────────┐
│   Hephaestus Server (FastAPI)           │
│   - Memory API endpoints                │
│   - LLM integration                     │
└──────────────────┬──────────────────────┘
                   │
                   │ HTTP
                   ▼
┌─────────────────────────────────────────┐
│   Qdrant Vector Database (6333)         │
│   - 7 Memory Collections                │
│   - Vector embeddings                   │
│   - Metadata indexing                   │
└─────────────────────────────────────────┘
```

## 🔄 Memory Workflow

### 1. **Create Memory**
```
Agent → Generate embedding (OpenAI) → Send to Qdrant → Store in collection
```

### 2. **Search Memory**
```
Query → Generate embedding → Search Qdrant → Retrieve similar memories → Return results
```

### 3. **Update Memory**
```
Agent → New insight → Update Qdrant point → Recalculate embeddings
```

## 📈 Best Practices

### For Development
1. **Check memory persistence**
   ```bash
   # After agent creates memory, verify it's stored
   curl http://localhost:6333/collections/hephaestus_agent_memories
   ```

2. **Monitor memory size**
   ```bash
   # Watch collection grow
   watch -n 5 'curl -s http://localhost:6333/collections | python3 -m json.tool'
   ```

3. **Clear memories if needed**
   ```bash
   # DELETE collection (warning: destructive)
   curl -X DELETE http://localhost:6333/collections/hephaestus_agent_memories
   ```

### For Production
1. **Regular backups**
   - Backup Qdrant storage volume
   - Version memory snapshots

2. **Monitor collection size**
   - Set alerts for collection growth
   - Implement retention policies

3. **Optimize embeddings**
   - Use consistent embedding model
   - Monitor similarity scores

## 🚨 Troubleshooting Checklist

- ✅ Qdrant container running: `docker ps | grep qdrant`
- ✅ Qdrant accessible: `curl http://localhost:6333/health`
- ✅ Collections exist: `curl http://localhost:6333/collections`
- ✅ Backend connected: Check `hephaestus_config.yaml` QDRANT_URL
- ✅ Memory endpoints working: Check backend logs for errors
- ✅ Embeddings being generated: Monitor OpenAI API usage
- ✅ Storage mounted correctly: `docker-compose ps | grep -E "volumes|qdrant"`

## 📝 Common Memory Operations

### List all memories in a collection
```bash
curl -X POST http://localhost:6333/collections/hephaestus_agent_memories/points/scroll \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 100,
    "with_payload": true,
    "with_vector": false
  }' | python3 -m json.tool
```

### Search similar memories
```bash
curl -X POST http://localhost:6333/collections/hephaestus_agent_memories/points/search \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, ...],
    "limit": 5,
    "with_payload": true
  }' | python3 -m json.tool
```

### Delete specific memory
```bash
curl -X POST http://localhost:6333/collections/hephaestus_agent_memories/points/delete \
  -H "Content-Type: application/json" \
  -d '{
    "points_selector": {
      "ids": [1, 2, 3]
    }
  }'
```

## ✨ Summary

The memory system is fully configured and operational:
- ✅ Qdrant running and accessible
- ✅ 7 collections created and indexed
- ✅ Memory API endpoints available
- ✅ Embedding integration configured
- ✅ Vector search ready

**Note**: If the system claims memories were created but you can't find them, verify:
1. Qdrant is running
2. Embedding generation completed
3. Network connectivity between services
4. API response logging is accurate

---

**Status**: ✅ Memory System Operational
**Last Verified**: 2025-11-07
**Qdrant Status**: Active (7 collections)
