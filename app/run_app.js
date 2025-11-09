#!/usr/bin/env node

/**
 * Hephaestus App Runner
 * Starts both frontend dev server and monitor process in parallel
 * Both share same tmux sessions and environment
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('🚀 HEPHAESTUS APP (Frontend + Monitor)');
console.log('═══════════════════════════════════════════════════════════════════════════════');
console.log('');

// Process management
const processes = [];
let allStarted = false;

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  processes.forEach(p => p.kill('SIGTERM'));
  setTimeout(() => process.exit(0), 2000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  processes.forEach(p => p.kill('SIGTERM'));
  setTimeout(() => process.exit(0), 2000);
});

/**
 * Start Frontend Dev Server
 */
function startFrontend() {
  return new Promise((resolve) => {
    console.log('📱 Starting Frontend Dev Server...');
    const frontend = spawn('npm', ['run', 'dev', '--prefix', 'frontend'], {
      cwd: '/app',
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });

    frontend.on('error', (err) => {
      console.error('❌ Frontend error:', err);
    });

    processes.push(frontend);
    setTimeout(resolve, 3000); // Wait 3 seconds for frontend to start
  });
}

/**
 * Start Monitor Process
 */
function startMonitor() {
  return new Promise((resolve) => {
    console.log('👁️  Starting Monitor Process...');
    const monitor = spawn('python', ['run_monitor.py'], {
      cwd: '/app',
      stdio: 'inherit',
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        MCP_HOST: '0.0.0.0',
        MCP_PORT: '8000',
        DATABASE_PATH: '/app/data/hephaestus.db',
        QDRANT_URL: process.env.QDRANT_URL || 'http://hephaestus-server:6333',
        MONITORING_INTERVAL_SECONDS: process.env.MONITORING_INTERVAL_SECONDS || '60'
      }
    });

    monitor.on('error', (err) => {
      console.error('❌ Monitor error:', err);
    });

    processes.push(monitor);
    resolve();
  });
}

/**
 * Main startup sequence
 */
async function startup() {
  try {
    // Start frontend first (slower startup)
    await startFrontend();
    console.log('✅ Frontend started on port 5173');
    console.log('');

    // Start monitor (faster startup)
    await startMonitor();
    console.log('✅ Monitor started');
    console.log('');

    allStarted = true;

    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('🎯 ALL PROCESSES RUNNING');
    console.log('═══════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('📊 Shared Environment:');
    console.log('  ├─ Frontend UI:        http://localhost:5173');
    console.log('  ├─ Backend API:        http://hephaestus-server:8000');
    console.log('  ├─ Vector Database:    http://hephaestus-server:6333');
    console.log('  └─ Shared tmux access: ✅ Frontend and Monitor share sessions');
    console.log('');
    console.log('📡 Monitor Features:');
    console.log('  ├─ Agent health monitoring');
    console.log('  ├─ LLM-powered diagnostics');
    console.log('  ├─ Automatic recovery');
    console.log('  ├─ Trajectory tracking');
    console.log('  └─ Shared with Frontend UI');
    console.log('');
    console.log('Press Ctrl+C to stop all services');
    console.log('');
  } catch (error) {
    console.error('❌ Startup error:', error);
    process.exit(1);
  }
}

startup();
