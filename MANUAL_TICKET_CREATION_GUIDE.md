# Manual Ticket Creation Guide

**Purpose**: Unblock Phase 1 → Phase 2 transition by manually creating tickets extracted from PRD analysis

**Time Required**: 10-15 minutes
**Risk Level**: LOW
**Prerequisites**: Docker services running, backend API responsive

---

## Quick Status Check

Before proceeding, verify current state:

```bash
# Check tickets exist
curl -s http://localhost:8000/api/tickets?workflow_id=cd4f1be7-e2c6-405d-8d40-4570c0ffc929 | jq '.total_count'
# Expected: 0 (currently)

# Check task status
curl -s http://localhost:8000/api/tasks/3550d3c2-0741-493e-9e27-5a500e0ec202 | jq '.status'
# Expected: "assigned" (currently)

# Check backend health
curl -s http://localhost:8000/health | jq '.status'
# Expected: "healthy"
```

---

## Data to Use

The extracted requirements from Phase 1 analysis are stored in:

```
Docker: /app/projects/stockton-ai/phase1_requirements.json
Host:   [Use the latest extracted data from agent]
```

The structured data includes:
- ✅ 6 Infrastructure tickets (need to be created first, no blockers)
- ✅ 11 Implementation tickets (per component, with dependencies)
- ✅ Dependency graph
- ✅ Component descriptions

---

## Step 1: Create Infrastructure Tickets (6 total)

These have NO blockers and should be created first.

### Ticket 1: Cloud Storage Infrastructure

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Infrastructure: Cloud Storage Setup",
    "description": "Set up cloud storage infrastructure for file ingestion from multiple sources. Include support for multi-tenant isolation, encryption at rest, and high-availability configuration. Integrate with major cloud providers (AWS S3, Azure Blob, GCP Cloud Storage) with automatic failover and backup mechanisms.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 1,
    "status": "backlog",
    "blockers": [],
    "acceptance_criteria": "Cloud storage infrastructure operational with multi-cloud support, encryption enabled, disaster recovery plan implemented"
  }'
```

### Ticket 2: Compute Resources

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Infrastructure: Compute Resources",
    "description": "Provision compute resources (containerized and serverless) for backend services, API gateway, and worker processes. Include auto-scaling configuration, load balancing, and container orchestration setup (Kubernetes or Docker Swarm).",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 1,
    "status": "backlog",
    "blockers": [],
    "acceptance_criteria": "Compute infrastructure provisioned, auto-scaling configured, load balancing operational, container orchestration ready"
  }'
```

### Ticket 3: Database Infrastructure

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Infrastructure: Database Provisioning",
    "description": "Set up primary PostgreSQL instance with read replicas, vector database (Qdrant) for embeddings, and document store (MongoDB/Firestore) for unstructured data. Configure replication, backups, point-in-time recovery, and monitoring.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 1,
    "status": "backlog",
    "blockers": [],
    "acceptance_criteria": "All databases provisioned, replication working, automated backups configured, monitoring in place"
  }'
```

### Ticket 4: IAM & Access Control

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Infrastructure: IAM Roles & Policies",
    "description": "Configure Identity & Access Management with role-based access control (RBAC) for users, service accounts, and API clients. Implement SSO integration, MFA enforcement, audit logging, and comply with SOC2/GDPR requirements.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 1,
    "status": "backlog",
    "blockers": [],
    "acceptance_criteria": "IAM roles configured, RBAC policies enforced, SSO working, audit logs available"
  }'
```

### Ticket 5: API Gateway & Routing

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Infrastructure: API Gateway & Request Routing",
    "description": "Set up API gateway with request routing, rate limiting, authentication/authorization, request validation, response transformation, and API versioning. Include support for REST and GraphQL endpoints with comprehensive logging and tracing.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 1,
    "status": "backlog",
    "blockers": [],
    "acceptance_criteria": "API gateway operational, routing rules configured, rate limiting active, auth working"
  }'
```

### Ticket 6: Monitoring & Observability

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Infrastructure: Monitoring & Observability Setup",
    "description": "Set up comprehensive monitoring with metrics collection, distributed tracing, log aggregation, alert rules, and dashboards. Integrate with monitoring stack (Prometheus, Grafana, ELK, Jaeger) and configure SLA monitoring for uptime and performance targets.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 1,
    "status": "backlog",
    "blockers": [],
    "acceptance_criteria": "Monitoring infrastructure online, metrics flowing, logs aggregated, alerts configured"
  }'
```

---

## Step 2: Create Implementation Tickets (11 total)

These have dependencies on infrastructure. They reference the infrastructure tickets created above.

### Ticket 7: Frontend UI Development

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Frontend UI Development",
    "description": "Build responsive web and mobile UI for Stockton-AI. Implement chat interface, financial dashboards, visualization components, multi-modal input (text, voice, upload), and real-time data updates. Use modern frameworks (React/Vue), responsive design for mobile-first approach.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Infrastructure: API Gateway & Request Routing"],
    "acceptance_criteria": "UI responsive across devices, all components implemented, real-time updates working, accessibility compliant"
  }'
```

### Ticket 8: Backend API Development

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Backend API Development",
    "description": "Build core backend API services for data processing, user management, query handling, and result generation. Implement REST endpoints, GraphQL layer, request validation, error handling, rate limiting, and caching strategies.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Infrastructure: Compute Resources", "Infrastructure: Database Provisioning", "Infrastructure: API Gateway & Request Routing"],
    "acceptance_criteria": "API endpoints operational, GraphQL layer working, error handling comprehensive, caching effective"
  }'
```

### Ticket 9: Data Ingestion Connectors

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Data Ingestion from External APIs",
    "description": "Build connectors for Plaid, QuickBooks, Stripe, Square, PayPal, Gusto, ADP, Shopify, and WooCommerce. Implement OAuth2 flows, API polling, webhook handlers, automatic retry logic, and error recovery mechanisms.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Infrastructure: Cloud Storage Setup", "Infrastructure: Compute Resources"],
    "acceptance_criteria": "All connectors implemented, OAuth flows working, data ingestion 24/7, error recovery verified"
  }'
```

### Ticket 10: Data Normalization Pipeline

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Data Normalization & Transformation",
    "description": "Build ETL pipeline to normalize and transform data from multiple sources into unified schema. Handle different date formats, currency conversions, account hierarchies, and data quality issues. Store results in PostgreSQL and data warehouse.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Implementation: Data Ingestion from External APIs", "Infrastructure: Database Provisioning"],
    "acceptance_criteria": "Pipeline operational, data normalized, quality checks passing, performance targets met"
  }'
```

### Ticket 11: Natural Language Query Engine

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Natural Language Query Engine",
    "description": "Build NLP system to convert natural language queries into structured data retrieval commands. Integrate with LLM (GPT-4, Claude) for semantic understanding, query intent detection, and result summarization. Support 50+ financial metrics and calculations.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Implementation: Data Normalization & Transformation", "Infrastructure: Compute Resources"],
    "acceptance_criteria": "Query engine functional, 50+ metrics supported, accuracy >90%, response time <2s"
  }'
```

### Ticket 12: Visualization Generation

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Visualization & Chart Generation",
    "description": "Build visualization engine to generate charts, tables, and graphs from financial data. Support multiple visualization types (line, bar, pie, waterfall, funnel), interactive elements, export to PDF/PNG, and dashboard customization.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Implementation: Natural Language Query Engine"],
    "acceptance_criteria": "All visualization types working, interactive features functional, export working, dashboards customizable"
  }'
```

### Ticket 13: Proactive Alerts & Notifications

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Proactive Alerts & Notifications",
    "description": "Build alert system to monitor financial metrics and notify users of anomalies, threshold breaches, and important events. Support multiple notification channels (email, SMS, push, in-app), configurable thresholds, and notification rules.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Implementation: Data Normalization & Transformation", "Infrastructure: Monitoring & Observability Setup"],
    "acceptance_criteria": "Alerts triggering correctly, notifications delivering, thresholds configurable, rules engine working"
  }'
```

### Ticket 14: Recommendation & Insights Engine

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Recommendation & Insights Engine",
    "description": "Build AI-driven recommendation system to suggest cost-saving opportunities, revenue optimization strategies, tax planning advice, and cash flow improvements. Use ML models to identify patterns and provide actionable recommendations.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Implementation: Natural Language Query Engine", "Implementation: Data Normalization & Transformation"],
    "acceptance_criteria": "ML models trained, recommendations accurate, insights actionable, A/B testing framework in place"
  }'
```

### Ticket 15: Scenario Modeling & What-If Analysis

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Scenario Modeling & What-If Analysis",
    "description": "Build scenario planning tool allowing users to model financial projections, test business decisions, and perform what-if analysis. Support multiple scenarios, sensitivity analysis, and comparison views.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Implementation: Data Normalization & Transformation", "Implementation: Visualization & Chart Generation"],
    "acceptance_criteria": "Scenario modeling working, sensitivity analysis implemented, comparison views functional"
  }'
```

### Ticket 16: Workflow Automation & Integration

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Workflow Automation & Vendor Management",
    "description": "Build automation engine for recurring financial tasks (bill payments, invoice processing, expense categorization). Integrate with third-party services for payment processing, invoice generation, and vendor management.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Implementation: Backend API Development", "Implementation: Data Ingestion from External APIs"],
    "acceptance_criteria": "Workflows executable, vendor management functional, payment processing integrated, automation reliable"
  }'
```

### Ticket 17: Marketplace API & Extensions

```bash
curl -X POST http://localhost:8000/create_ticket \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "title": "Implementation: Marketplace API & Extension Framework",
    "description": "Build extensibility framework and marketplace API for third-party integrations. Support plugins, custom apps, and white-label deployment options. Implement API versioning, SDK generation, developer documentation, and marketplace hosting.",
    "workflow_id": "cd4f1be7-e2c6-405d-8d40-4570c0ffc929",
    "phase": 2,
    "status": "backlog",
    "blockers": ["Implementation: Backend API Development"],
    "acceptance_criteria": "API documented, SDK generated, plugins loadable, marketplace operational, white-label options available"
  }'
```

---

## Step 3: Verify Ticket Creation

```bash
# Count all tickets
curl -s http://localhost:8000/api/tickets?workflow_id=cd4f1be7-e2c6-405d-8d40-4570c0ffc929 | jq '.total_count'
# Expected result: 17

# List all tickets
curl -s http://localhost:8000/api/tickets?workflow_id=cd4f1be7-e2c6-405d-8d40-4570c0ffc929 | jq '.tickets[] | {title, status, blockers}'

# Check specific ticket created
curl -s 'http://localhost:8000/api/tickets' | jq '.tickets[] | select(.title | contains("Cloud Storage"))'
```

---

## Step 4: Update Task Status

Once all 17 tickets are created, mark Phase 1 task as complete:

```bash
curl -X POST http://localhost:8000/update_task_status \
  -H "Content-Type: application/json" \
  -H "X-Agent-ID: manual-bootstrap" \
  -d '{
    "task_id": "3550d3c2-0741-493e-9e27-5a500e0ec202",
    "status": "done",
    "summary": "✅ Phase 1 Complete: Analyzed Stockton AI PRD. Identified 6 infrastructure and 11 implementation components with dependencies. Created all required tickets in database. Blocking relationships established. Memory decisions saved. Ready for Phase 2 planning."
  }'
```

---

## Step 5: Verify Task Completion

```bash
# Check task status
curl -s http://localhost:8000/api/tasks/3550d3c2-0741-493e-9e27-5a500e0ec202 | jq '{status, summary}'
# Expected: status="done"

# Check Phase 2 tasks spawned
curl -s 'http://localhost:8000/api/tasks?phase=2&workflow_id=cd4f1be7-e2c6-405d-8d40-4570c0ffc929' | jq '.total_count'
# Expected: 11 (if auto-spawned)
```

---

## Troubleshooting

### If ticket creation fails with 400 error
- Verify `workflow_id` is correct: `cd4f1be7-e2c6-405d-8d40-4570c0ffc929`
- Check JSON is valid (no quotes issues)
- Verify backend is running: `curl http://localhost:8000/health`

### If ticket creation times out
- Check backend logs: `docker compose logs hephaestus-server`
- Verify database is responsive: `docker compose logs hephaestus-postgres`
- Retry the request

### If tickets created but task won't mark done
- Check task ID is correct
- Verify workflow_id matches
- Check backend logs for error messages

---

## Expected Timeline

- **Ticket 1-6 (Infrastructure)**: ~2 minutes
- **Ticket 7-17 (Implementation)**: ~8 minutes
- **Verify & Update Status**: ~2 minutes
- **Total**: ~12 minutes

---

## Success Indicators

After completion:

```
✅ 17 tickets in database
✅ Task 3550d3c2 status = "done"
✅ Phase 1 complete
✅ Ready for Phase 2 tasks
✅ System unblocked
```

---

**Next**: Proceed to Phase 2 once task marked as "done"
