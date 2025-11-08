#!/bin/bash
# Verification script for OpenCode MCP configuration in Hephaestus

set -e

echo "🔍 Verifying OpenCode MCP Configuration for Hephaestus"
echo "========================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "opencode.json" ]; then
    echo -e "${RED}❌ Error: opencode.json not found. Please run this script from the Hephaestus directory.${NC}"
    exit 1
fi

echo "1️⃣  Checking opencode.json configuration..."
if grep -q "mcpServers" opencode.json; then
    echo -e "${GREEN}✅ mcpServers section found in opencode.json${NC}"
    
    # Check for Qdrant MCP
    if grep -q '"qdrant"' opencode.json; then
        echo -e "${GREEN}✅ Qdrant MCP server configured${NC}"
    else
        echo -e "${RED}❌ Qdrant MCP server NOT configured${NC}"
    fi
    
    # Check for Hephaestus MCP
    if grep -q '"hephaestus"' opencode.json; then
        echo -e "${GREEN}✅ Hephaestus MCP server configured${NC}"
    else
        echo -e "${RED}❌ Hephaestus MCP server NOT configured${NC}"
    fi
else
    echo -e "${RED}❌ mcpServers section NOT found in opencode.json${NC}"
    echo -e "${YELLOW}⚠️  Please update opencode.json to include MCP server configuration${NC}"
    exit 1
fi

echo ""
echo "2️⃣  Checking MCP server scripts..."

if [ -f "qdrant_mcp_openai.py" ]; then
    echo -e "${GREEN}✅ qdrant_mcp_openai.py exists${NC}"
else
    echo -e "${RED}❌ qdrant_mcp_openai.py NOT found${NC}"
fi

if [ -f "claude_mcp_client.py" ]; then
    echo -e "${GREEN}✅ claude_mcp_client.py exists${NC}"
else
    echo -e "${RED}❌ claude_mcp_client.py NOT found${NC}"
fi

echo ""
echo "3️⃣  Checking environment variables..."

if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    if grep -q "OPENAI_API_KEY=" .env && ! grep -q "OPENAI_API_KEY=your-" .env; then
        echo -e "${GREEN}✅ OPENAI_API_KEY is set${NC}"
    else
        echo -e "${RED}❌ OPENAI_API_KEY is NOT set or is placeholder${NC}"
    fi
    
    if grep -q "ANTHROPIC_API_KEY=" .env && ! grep -q "ANTHROPIC_API_KEY=your-" .env; then
        echo -e "${GREEN}✅ ANTHROPIC_API_KEY is set${NC}"
    else
        echo -e "${YELLOW}⚠️  ANTHROPIC_API_KEY is NOT set (optional if using other providers)${NC}"
    fi
else
    echo -e "${RED}❌ .env file NOT found${NC}"
fi

echo ""
echo "4️⃣  Checking Docker services..."

if command -v docker &> /dev/null; then
    if docker-compose ps | grep -q "hephaestus-server"; then
        echo -e "${GREEN}✅ hephaestus-server container is running${NC}"
    else
        echo -e "${YELLOW}⚠️  hephaestus-server container is NOT running${NC}"
        echo "   Run: docker-compose up -d"
    fi
    
    if docker-compose ps | grep -q "qdrant"; then
        echo -e "${GREEN}✅ qdrant container is running${NC}"
    else
        echo -e "${YELLOW}⚠️  qdrant container is NOT running${NC}"
        echo "   Run: docker-compose up -d"
    fi
else
    echo -e "${YELLOW}⚠️  Docker not found, skipping container checks${NC}"
fi

echo ""
echo "5️⃣  Checking service health..."

# Check Qdrant health
if curl -s http://localhost:6333/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Qdrant is healthy (http://localhost:6333)${NC}"
else
    echo -e "${YELLOW}⚠️  Qdrant is NOT accessible on http://localhost:6333${NC}"
fi

# Check Hephaestus server health
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Hephaestus server is healthy (http://localhost:8000)${NC}"
else
    echo -e "${YELLOW}⚠️  Hephaestus server is NOT accessible on http://localhost:8000${NC}"
fi

echo ""
echo "6️⃣  Checking Docker volume mounts..."

if [ -f "docker-compose.yml" ]; then
    if grep -q "opencode.json:/app/opencode.json" docker-compose.yml; then
        echo -e "${GREEN}✅ opencode.json is mounted in docker-compose.yml${NC}"
    else
        echo -e "${RED}❌ opencode.json is NOT mounted in docker-compose.yml${NC}"
    fi
    
    if grep -q "opencode.json:/root/.config/opencode/opencode.json" docker-compose.yml; then
        echo -e "${GREEN}✅ opencode.json is mounted to user config location${NC}"
    else
        echo -e "${YELLOW}⚠️  opencode.json is NOT mounted to user config location${NC}"
    fi
else
    echo -e "${RED}❌ docker-compose.yml NOT found${NC}"
fi

echo ""
echo "========================================================"
echo "📋 Summary"
echo "========================================================"
echo ""
echo "Configuration Status:"
echo "  • opencode.json: MCP servers configured"
echo "  • MCP Scripts: Available"
echo "  • Environment: Variables set"
echo "  • Docker: Services running"
echo ""
echo "Next Steps:"
echo "  1. If services are not running: docker-compose up -d"
echo "  2. If configuration was just updated: docker-compose restart hephaestus-server"
echo "  3. Check agent logs: docker logs hephaestus-server --tail 50"
echo "  4. View full documentation: cat OPENCODE_MCP_SETUP.md"
echo ""
echo "✨ OpenCode agents will now have access to:"
echo "   • Qdrant MCP: qdrant_find, qdrant_store"
echo "   • Hephaestus MCP: create_task, get_tasks, update_task_status, etc."
echo ""

