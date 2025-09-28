## System Architecture

This document describes the end-to-end architecture of the Smart Office IoT Dashboard, a web-based user interface for monitoring environmental sensors and controlling devices across rooms via MQTT. The solution follows a thin-client pattern, where a React single-page application (SPA) connects directly to an MQTT broker over WebSocket (WS/WSS). EMQX is used as the broker in development via Docker Compose. The application renders charts and gauges from incoming sensor telemetry and publishes control commands for devices.

- Frontend application: React 18 + TypeScript, bundled by Create React App (`react-scripts`). UI is built with Material UI (MUI). Visualization is implemented with Chart.js via `react-chartjs-2`.
- Messaging: MQTT v5 over WebSocket (port 8083 in dev). Topics follow a room-centric format `office/{roomId}` with JSON payloads; legacy device-centric topics are still handled for backward compatibility.
- State management: A dedicated `MQTTContext` encapsulates connection lifecycle, subscriptions, publishing, message parsing, and in-memory data stores for both live values and chart series. Workspace layout and editor state are persisted to `localStorage`.
- Deployment (dev): Docker Compose spins up EMQX and a Node 24 container to run the frontend dev server on port 3000. The SPA connects to the broker using the browser’s current protocol/host to simplify local and containerized workflows.

Data flow overview:

1) Browser loads SPA → initializes `MQTTProvider`.
2) `MQTTProvider` constructs the WS/WSS MQTT URL from `window.location` and establishes a client with `mqtt.connect()`.
3) On connect, and when the selected room changes, the client subscribes to `office/{currentRoomId}`.
4) Devices publish telemetry as JSON to `office/{roomId}`. Example payload:
   ```json
   {
     "temperature": 27.2,
     "humidity": 47.6,
     "co2": 520,
     "tvoc": 0.62,
     "light": "on",
     "ac": 23,
     "curtain": "open"
   }
   ```
5) The provider parses each message, updates:
   - `deviceStates`: keyed by normalized state topics (e.g., `office/room1/light/state`).
   - `sensorData`: rolling arrays for temperature, humidity, CO2, TVOC (last 30 points).
   - `currentSensorValues`: most recent numeric readings.
   - `messageLog`: latest 200 raw messages for inspection.
6) UI components subscribe to the context to render gauges, charts, and control widgets. User actions publish JSON commands back to `office/{roomId}` via `publishRoom()`.

Topic model:

- Primary (room JSON): `office/{roomId}` — compact representation of room state and sensors as a single JSON payload. Minimizes topic sprawl, simplifies subscription.
- Legacy (device granularity): `office/{room}/{device}/{subtopic}` — still parsed to remain backward compatible. Example: `office/room1/light/state`.

Non-functional considerations:

- Security: Use WSS in production, enable EMQX authentication/authorization (per-user ACLs), rotate credentials, and enforce TLS (port 8084/8883). Avoid embedding secrets in the frontend; for production, provision credentials at runtime via a backend or short-lived tokens.
- Performance: Rolling windows (30 points) cap series growth; Chart.js is efficient for this scale. Avoid excessive re-renders via coarse-grained context updates and React memoization in heavy components as needed.
- Reliability: The MQTT client handles `connect`, `error`, and `close` events; UI reflects connectivity. Subscriptions are guarded to avoid racing during disconnects/unmounts.

High-level logical components:

- `MQTTProvider` (context): connection, subscription, parsing, publish helpers, in-memory stores.
- `Dashboard` page: orchestrates layout, tabs, and composes visualization and control components.
- Visualization widgets: gauges and charts for temperature, humidity, CO2, TVOC, combined charts, and air quality bar.
- Control widgets: `DeviceControl` for lights, AC, curtains, publishing room-scoped JSON commands.
- Workspace designer: `Palette`, `Canvas`, `SettingsPanel` for arranging widgets per room, persisted in `localStorage`.

Deployment (dev) components:

- EMQX broker container exposing 1883, 8083, 8084, 8883, 18083 (dashboard) with default credentials (dev only).
- Frontend container running `npm install && npm start`, exposing port 3000, with polling enabled for hot reload.

Operational context:

- The SPA can be deployed as static assets behind a CDN or a reverse proxy (e.g., Nginx), with the broker reachable over WSS from browsers. Production ops should externalize credentials and use broker-side policies.

Key risks and mitigations:

- Credential exposure: Avoid hardcoding secrets; leverage environment injection or token-based auth.
- Network topology: Ensure the broker is reachable from client networks (firewalls, CORS, TLS SNI).
- Message schema drift: Stabilize the room JSON schema and version payloads as needed.


## Technological Stack

This section enumerates the technologies used, their roles, and rationale.

Application layer:

- React 18 (SPA) with TypeScript: predictable UI model, strong typing for maintainability, broad ecosystem.
- Material UI (MUI): consistent, responsive design system; rapid component composition for dashboards.
- Chart.js + `react-chartjs-2`: robust 2D charting suitable for time-series sensor data; small footprint compared to full graphing libraries.
- React Router: single-page navigation; current app uses a simple route wrapper around the dashboard.

Messaging and connectivity:

- `mqtt` (v5) client library: WebSocket-based MQTT connectivity in the browser; supports QoS, retained messages, etc.
- EMQX broker (Docker): high-performance, MQTT 5-compliant broker with authentication/authorization, websockets, and observability.

Language, tooling, and build:

- TypeScript 4.9: static typing for safer refactors and API contracts (context, widgets).
- Create React App (`react-scripts`): dev server, bundling, testing harness (Jest/RTL), zero-config start.
- ESLint (via CRA config): enforces code style and common pitfalls.

Visualization and time utilities:

- `date-fns` and `chartjs-adapter-date-fns`: lightweight date formatting and time-scale support in charts.

Docker and runtime:

- Docker Compose: multi-service local environment (EMQX + frontend). Node 24 runtime for dev server. Ports 3000 (UI), 8083 (MQTT WS), 18083 (EMQX UI) exposed by default.

Why this stack:

- Frontend-only with broker connectivity removes the need for a bespoke backend for read paths. MQTT Brokers are built to fan-out and persist retained messages, which browsers can consume directly via websockets when permitted.
- TypeScript and React provide maintainability and safety for evolving UI components and data structures (e.g., `WorkspaceState`).
- EMQX gives first-class MQTT 5 support, flexible auth, and operational tooling, with a path to production.

Extensibility considerations:

- Add a lightweight backend later (Node/Express or serverless) for credential issuance, per-user authorization, and historical analytics aggregation.
- Introduce persistent chart history via Timeseries DB (e.g., InfluxDB, TimescaleDB) fed by broker rule-engine or backend consumer; keep SPA subscribed for the latest horizon.
- Integrate service workers for offline read of last-known state if a local cache is acceptable.

Security posture:

- Prefer WSS with valid certificates. Leverage EMQX user management and ACLs to scope topic access per tenant/room. Consider OIDC-backed token exchange for short-lived MQTT credentials.


## Component Catalogue and Implementation

This section catalogs the primary UI and infrastructure components, clarifying responsibilities, inputs/outputs, and key implementation details.

Core infrastructure:

- `MQTTContext` (`src/contexts/MQTTContext.tsx`):
  - Responsibilities: connect/disconnect lifecycle; guarded subscriptions; message parsing; publish helpers; data stores for device states, sensor time-series, current values, and message log.
  - External API: `publish(topic, message)`, `publishRoom(roomId, payload)`, `publishToCurrentRoom(payload)`, and state selectors (`isConnected`, `sensorData`, `currentSensorValues`, `messageLog`, `deviceStates`).
  - Implementation: URL derived from `window.location` protocol/host to work in dev/containers. JSON payload parsing updates both normalized state keys and visualization buffers, capped to 30 points.

Page composition:

- `Dashboard` (`src/pages/Dashboard.tsx`): orchestrates the AppBar, tabs (Dashboard/Designer), and grid layouts of widgets.
  - Ingests `sensorData` and `currentSensorValues` from the context; falls back to generated dummy data when telemetry is absent.
  - Hosts cardized components in a responsive MUI Grid with `StyledPaper` wrappers.

Visualization components (selected):

- Gauges: `TemperatureGauge`, `HumidityGauge`, `CO2Gauge`, `TVOCGauge` – read from `currentSensorValues` and render domain-specific progress/dial visuals.
- Charts: `TemperatureChart`, `HumidityChart`, `CO2Chart`, `TVOCChart`, `CombinedChart` – consume `sensorData` arrays (or fallbacks) and render time-series with appropriate units and colors.
- `AirQualityBar`: compact composite indicator for overall air quality.

Diagnostics and tooling:

- `MQTTInspector`: surfaces latest messages (`messageLog`) for debugging subscriptions and payloads.
- `MQTTTester`: allows ad-hoc publishing to topics for integration testing during development.

Control components:

- `DeviceControl`: parameterized by room and device type (light, AC, curtain). Emits room-scoped JSON commands via `publishRoom()` to `office/{roomId}`; expects devices to interpret keys such as `light`, `ac`, `curtain`.

Workspace designer:

- `Palette`: create/select rooms, add widgets into the current room. Uses `WorkspaceState` persisted in `localStorage` via utilities in `src/utils/storage.ts`.
- `Canvas`: drag-and-drop style canvas for arranging `BaseWidget` instances (x, y, w, h) for the selected room.
- `SettingsPanel`: edits selected widget properties; propagates changes to the workspace state.

Types and persistence:

- `WidgetType`, `BaseWidget`, `RoomLayout`, `WorkspaceState` in `src/types/widgets.ts` define the layout model.
- `loadWorkspace`, `saveWorkspace`, `upsertRoom`, `setCurrentRoom` in `src/utils/storage.ts` implement persistence and mutation helpers backed by `localStorage`.

Inter-component data contracts:

- Sensor arrays contain items of shape `{ timestamp: Date; value: number }`.
- Commands are normalized JSON payloads with device/sensor keys; expand with caution to maintain schema stability.

Implementation safeguards:

- Guarded subscription/unsubscription on room changes to avoid races during reconnects.
- Capped message log and chart buffers to prevent unbounded memory growth.
- Strict TypeScript interfaces for context shape and widget models.


## Introduction (Deployment, Testing and Operations)

This part introduces processes and practices for reliably deploying, validating, and operating the Smart Office IoT Dashboard in development and production-like environments. While the current repository focuses on a browser-based frontend connected to an MQTT broker (EMQX) via WebSocket, the operational guidance below outlines a path to secure, resilient production deployments.

Goals:

- Provide a repeatable deployment process for development and production.
- Ensure verification and testing practices cover functionality, performance, security, and usability.
- Define how the system is monitored, maintained, and supported in daily operations.

Scope:

- Frontend SPA artifacts and runtime environment (dev server vs. static hosting).
- MQTT broker connectivity, authentication, and authorization.
- Testing strategy (unit, integration, end-to-end) and acceptance verification.
- Operational processes including monitoring, incident response, backups, and change management.

Non-goals:

- Backend APIs or data services beyond the MQTT broker (future work may introduce a credential-issuing backend and data historian).


## Deployment Model

Environments:

- Development: Docker Compose orchestrates EMQX and a Node-based dev server. The SPA connects to `ws://{host}:8083/mqtt` (or `wss://` under HTTPS).
- Staging/Production: The SPA is built to static assets and served via a CDN or reverse proxy (e.g., Nginx). The MQTT broker is exposed via WSS with valid certificates. Optional API gateway/backends may issue short-lived MQTT credentials.

Topology:

- Client (browser) ←→ CDN/Reverse Proxy (HTTPS) ←→ SPA static assets
- Client (browser) ←→ Reverse Proxy/LB (WSS) ←→ MQTT Broker (EMQX cluster)

Service components:

- SPA hosting: Nginx, S3 + CloudFront, or similar static hosting with HTTP/2 and TLS.
- MQTT broker: EMQX in a single node for dev; multi-node cluster with persistence and monitoring for production. Listeners: 8083 (WS), 8084 (WSS), 1883/8883 (TCP/TLS) as required.

Security controls:

- TLS termination at the edge for both HTTPS and WSS. Mutual TLS is optional for device connections; browser clients rely on user/password or token-derived credentials.
- EMQX authentication (built-in DB, LDAP, or JWT) and ACLs restricting topic access, typically scoped by room/tenant.

Scalability:

- SPA scales horizontally via CDN. Broker scales vertically and horizontally (EMQX cluster) with shared state and retained messages as needed.

Availability and DR:

- Multi-AZ broker cluster with snapshot/backup of auth stores and persistent data (if used). CDN-backed SPA hosting offers high availability by default.


## Deployment Process

Prerequisites:

- Node.js 16+ for local builds; Docker Desktop for containerized dev.
- Access to an MQTT broker (EMQX recommended) with WSS enabled and appropriate credentials.

Local development (non-container):

1) `npm install`
2) Configure MQTT in `MQTTContext` or via env: `REACT_APP_MQTT_PORT`, broker host/protocol derived from `window.location`.
3) `npm start` to run CRA dev server on `http://localhost:3000`.

Local development (Docker Compose):

1) `docker-compose up -d`
2) Visit SPA at `http://localhost:3000` and EMQX dashboard at `http://localhost:18083` (default dev creds `admin/public`).

Production build and release:

1) `npm run build` produces static assets under `build/`.
2) Upload to hosting (e.g., `aws s3 sync build/ s3://bucket`); invalidate CDN cache.
3) Configure reverse proxy to forward `/mqtt` WSS to the broker’s WSS listener.
4) Provision EMQX users/ACLs; rotate secrets. Optionally, implement a token exchange service.

CI/CD recommendations:

- Lint/test on PRs. Build artifacts as a pipeline step. Deploy on merge to main to staging; promote to production after verification gates.
- Parameterize environment via build-time or runtime injection (e.g., env-config JavaScript served alongside SPA).

Configuration management:

- Maintain environment-specific settings (broker URL, ports, TLS) external to the code. For SPA, load a `config.json` at runtime to avoid rebuilds for each environment.

Rollback:

- Keep prior static artifact versions; roll back by repointing the CDN origin or restoring the previous asset set. For broker config, maintain versioned backups.


## Verification and Testing Strategy

Test layers:

- Unit tests (components and utilities):
  - Use Jest + React Testing Library (bundled with CRA) to validate component rendering and basic interactions.
  - Mock `useMQTT` to inject deterministic `sensorData` and `currentSensorValues`.

- Integration tests (context + components):
  - Mount `MQTTProvider` in a test environment with a mocked MQTT client. Verify subscription behavior on room changes and that messages update charts/gauges.
  - Validate `publishRoom` payloads for control widgets.

- End-to-end tests:

  - Use Cypress or Playwright to drive the browser: verify that selecting rooms triggers subscriptions and that gauges/charts reflect incoming telemetry. Stand up a test EMQX (or a mock broker) that publishes canned data to `office/{roomId}`.

- Performance and UX tests:

  - Lighthouse audits for performance and accessibility (especially chart-heavy pages). Measure First Contentful Paint (FCP) and Interaction to Next Paint (INP).
  - Verify rendering performance under steady telemetry (e.g., 1 message/sec per room) and cap chart history appropriately.

- Security tests:

  - Validate WSS configuration, certificate chains, and mixed-content avoidance. Attempt topic access outside authorized scope to confirm ACL enforcement. Scan for sensitive data in the bundle.

Data and fixtures:

- Provide JSON payload fixtures for room telemetry at various rates and values, including edge cases (NaN, null, out-of-range). Include legacy topic format samples to maintain compatibility coverage.

Acceptance criteria (examples):

- On received telemetry, charts update within 250 ms, and gauges reflect values within 100 ms.
- Device commands publish with correct keys and value ranges per device type.
- Disconnection is reflected in the UI within 1 s, with auto-reconnect behavior verified.

Test automation in CI:

- Run unit/integration on each PR. Execute a smoke E2E suite against a temporary environment using an ephemeral EMQX container publishing fixtures.


## Operational Model

Monitoring and observability:

- Frontend: collect web vitals and JavaScript errors (e.g., via a RUM provider). Track MQTT connection state transitions and message rates as custom metrics.
- Broker: EMQX exposes metrics/health; monitor connection counts, message throughput, dropped messages, and auth failures. Integrate with Prometheus/Grafana if available.

Logging:

- Frontend: console logs should be minimized in production. Route significant client-side errors to a logging backend.
- Broker: retain structured logs; forward to centralized logging (e.g., ELK, Loki) with retention policies.

Security operations:

- Credential lifecycle: rotate EMQX user passwords or JWT secrets regularly. Prefer short-lived tokens for browsers.
- Access control: maintain ACLs per tenant/room. Periodically audit topic patterns and retained messages.
- TLS: automate certificate renewal (e.g., ACME) and enforce strong ciphers.

Capacity and scaling:

- SPA scales via CDN edge; ensure cache policies and compression (gzip/brotli). For broker, scale horizontally with EMQX clustering and vertically with resource tuning. Load test with representative telemetry rates.

Backups and recovery:

- SPA assets are immutable and can be redeployed. Backup broker config, auth databases, and any persistent retained messages if used. Define RPO/RTO targets and test recovery.

Incident management:

- Define severity levels, on-call rotation, and runbooks (e.g., broker unreachable, WSS certificate expiry, abnormal message rates). Practice game days.

Change management:

- Use feature flags in the SPA for risky UI changes. Deploy behind staging with synthetic telemetry verification. Document broker configuration changes and apply via version-controlled IaC if possible.

Service levels:

- Establish SLOs (e.g., 99.9% availability for SPA and broker WSS endpoints). Track error budgets and prioritize reliability work when budgets are depleted.

Future enhancements:

- Introduce a backend for credential issuance and historical analytics. Adopt a timeseries store for long-term visualization. Expand E2E coverage and synthetic monitoring.

