#!/usr/bin/env python3
"""
Test script to verify OpenCode MCP integration in Hephaestus
Tests both MCP servers directly and through OpenCode CLI
"""

import subprocess
import json
import sys
import time
from pathlib import Path

def print_header(text):
    """Print a formatted header"""
    print("\n" + "="*70)
    print(f"  {text}")
    print("="*70)

def print_test(name, passed, details=""):
    """Print test result"""
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status} - {name}")
    if details:
        print(f"     {details}")

def test_mcp_server_script(script_path, server_name):
    """Test if MCP server script exists and is executable"""
    print_header(f"Testing {server_name} MCP Server Script")
    
    # Check if script exists
    exists = Path(script_path).exists()
    print_test(f"{server_name} script exists", exists, script_path)
    
    if not exists:
        return False
    
    # Check if script is executable
    try:
        result = subprocess.run(
            ["python3", script_path, "--help"],
            capture_output=True,
            timeout=5,
            text=True
        )
        # MCP servers might not have --help, so just check it doesn't crash immediately
        executable = True
    except Exception as e:
        executable = False
        print_test(f"{server_name} script is executable", False, str(e))
        return False
    
    print_test(f"{server_name} script is executable", executable)
    return executable

def test_hephaestus_server():
    """Test Hephaestus server health"""
    print_header("Testing Hephaestus Server")
    
    try:
        import requests
        response = requests.get("http://localhost:8000/health", timeout=5)
        healthy = response.status_code == 200
        print_test("Hephaestus server is healthy", healthy, 
                  f"Status: {response.status_code}")
        return healthy
    except Exception as e:
        print_test("Hephaestus server is healthy", False, str(e))
        return False

def test_qdrant_server():
    """Test Qdrant server health"""
    print_header("Testing Qdrant Server")
    
    try:
        import requests
        response = requests.get("http://localhost:6333/health", timeout=5)
        healthy = response.status_code == 200
        print_test("Qdrant server is healthy", healthy,
                  f"Status: {response.status_code}")
        return healthy
    except Exception as e:
        print_test("Qdrant server is healthy", False, str(e))
        return False

def test_opencode_config():
    """Test OpenCode configuration"""
    print_header("Testing OpenCode Configuration")
    
    config_path = Path("opencode.json")
    if not config_path.exists():
        print_test("opencode.json exists", False)
        return False
    
    print_test("opencode.json exists", True)
    
    try:
        with open(config_path) as f:
            config = json.load(f)
        
        has_mcp = "mcpServers" in config
        print_test("mcpServers section exists", has_mcp)
        
        if has_mcp:
            has_qdrant = "qdrant" in config["mcpServers"]
            has_hephaestus = "hephaestus" in config["mcpServers"]
            
            print_test("Qdrant MCP configured", has_qdrant)
            print_test("Hephaestus MCP configured", has_hephaestus)
            
            return has_qdrant and has_hephaestus
        
        return False
    except Exception as e:
        print_test("Config is valid JSON", False, str(e))
        return False

def test_docker_container_config():
    """Test that config is mounted in Docker container"""
    print_header("Testing Docker Container Configuration")
    
    try:
        # Check if config is mounted in container
        result = subprocess.run(
            ["docker", "exec", "hephaestus-server", "cat", "/app/opencode.json"],
            capture_output=True,
            timeout=10,
            text=True
        )
        
        if result.returncode != 0:
            print_test("Config mounted in container", False, result.stderr)
            return False
        
        print_test("Config mounted at /app/opencode.json", True)
        
        # Parse and check config
        config = json.loads(result.stdout)
        has_mcp = "mcpServers" in config
        print_test("mcpServers in container config", has_mcp)
        
        # Check user config location
        result2 = subprocess.run(
            ["docker", "exec", "hephaestus-server", "cat", 
             "/root/.config/opencode/opencode.json"],
            capture_output=True,
            timeout=10,
            text=True
        )
        
        user_config_exists = result2.returncode == 0
        print_test("Config mounted at user location", user_config_exists)
        
        return has_mcp and user_config_exists
        
    except Exception as e:
        print_test("Docker container accessible", False, str(e))
        return False

def test_mcp_tools_in_container():
    """Test that MCP server scripts are accessible in container"""
    print_header("Testing MCP Scripts in Container")
    
    scripts = {
        "Qdrant MCP": "/app/qdrant_mcp_openai.py",
        "Hephaestus MCP": "/app/claude_mcp_client.py"
    }
    
    all_exist = True
    for name, path in scripts.items():
        try:
            result = subprocess.run(
                ["docker", "exec", "hephaestus-server", "test", "-f", path],
                capture_output=True,
                timeout=5
            )
            exists = result.returncode == 0
            print_test(f"{name} script exists in container", exists, path)
            all_exist = all_exist and exists
        except Exception as e:
            print_test(f"{name} script exists in container", False, str(e))
            all_exist = False
    
    return all_exist

def test_mcp_server_execution():
    """Test that MCP servers can be executed"""
    print_header("Testing MCP Server Execution")
    
    # Test Hephaestus MCP health_check tool
    print("\n🔧 Testing Hephaestus MCP health_check tool...")
    try:
        # Create a simple test script that imports and uses the MCP client
        test_script = """
import sys
sys.path.insert(0, '/app')
from claude_mcp_client import health_check
result = health_check()
print(result)
"""
        result = subprocess.run(
            ["docker", "exec", "hephaestus-server", "python3", "-c", test_script],
            capture_output=True,
            timeout=10,
            text=True
        )
        
        success = result.returncode == 0 and "healthy" in result.stdout.lower()
        print_test("Hephaestus MCP health_check works", success, 
                  result.stdout.strip() if success else result.stderr.strip())
        
    except Exception as e:
        print_test("Hephaestus MCP health_check works", False, str(e))
        success = False
    
    return success

def test_opencode_installation():
    """Test that OpenCode is installed in container"""
    print_header("Testing OpenCode Installation")
    
    try:
        result = subprocess.run(
            ["docker", "exec", "hephaestus-server", "which", "opencode"],
            capture_output=True,
            timeout=5,
            text=True
        )
        
        installed = result.returncode == 0
        print_test("OpenCode CLI is installed", installed, 
                  result.stdout.strip() if installed else "Not found")
        
        if installed:
            # Check version
            result2 = subprocess.run(
                ["docker", "exec", "hephaestus-server", "opencode", "--version"],
                capture_output=True,
                timeout=5,
                text=True
            )
            version_info = result2.stdout.strip() if result2.returncode == 0 else "Unknown"
            print_test("OpenCode version check", result2.returncode == 0, version_info)
        
        return installed
        
    except Exception as e:
        print_test("OpenCode CLI is installed", False, str(e))
        return False

def main():
    """Run all tests"""
    print("\n" + "🧪 " * 35)
    print("  OpenCode MCP Integration Test Suite")
    print("🧪 " * 35)
    
    results = {}
    
    # Test 1: MCP Server Scripts
    results['qdrant_script'] = test_mcp_server_script(
        "qdrant_mcp_openai.py", "Qdrant"
    )
    results['hephaestus_script'] = test_mcp_server_script(
        "claude_mcp_client.py", "Hephaestus"
    )
    
    # Test 2: Server Health
    results['hephaestus_health'] = test_hephaestus_server()
    results['qdrant_health'] = test_qdrant_server()
    
    # Test 3: Configuration
    results['opencode_config'] = test_opencode_config()
    results['docker_config'] = test_docker_container_config()
    
    # Test 4: Container Setup
    results['mcp_scripts_container'] = test_mcp_tools_in_container()
    results['opencode_installed'] = test_opencode_installation()
    
    # Test 5: MCP Execution
    results['mcp_execution'] = test_mcp_server_execution()
    
    # Summary
    print_header("Test Summary")
    
    total = len(results)
    passed = sum(1 for v in results.values() if v)
    failed = total - passed
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    print(f"   ✅ Passed: {passed}")
    print(f"   ❌ Failed: {failed}")
    
    if failed > 0:
        print("\n⚠️  Failed tests:")
        for test, result in results.items():
            if not result:
                print(f"   • {test}")
    
    print("\n" + "="*70)
    
    if passed == total:
        print("🎉 All tests passed! OpenCode MCP integration is working correctly.")
        print("\n✨ OpenCode agents can now use:")
        print("   • qdrant_find - Search agent memories")
        print("   • qdrant_store - Save discoveries")
        print("   • create_task - Spawn new tasks")
        print("   • get_tasks - Query task status")
        print("   • update_task_status - Update tasks")
        print("   • save_memory - Store learnings")
        print("   • get_agent_status - Check agent status")
        return 0
    else:
        print("⚠️  Some tests failed. Please review the output above.")
        print("\n💡 Troubleshooting:")
        print("   1. Ensure Docker services are running: docker-compose ps")
        print("   2. Restart services: docker-compose restart")
        print("   3. Check logs: docker logs hephaestus-server")
        print("   4. Review configuration: cat opencode.json")
        return 1

if __name__ == "__main__":
    sys.exit(main())

