# 🔐 PrivacyLens — Privacy-Preserving Journey Analytics Tool

> **College Prototype Project — Review 2 Updated**  
> A practical, lightweight, and complete full-stack web application demonstrating **Differential Privacy** in SaaS journey analytics.  
> Identifies workflow abandonment **without collecting any personal data (Zero PII)**.

---

## ⚡ 1-Step Quick Start

From the `privacy-analytics` root directory:

```bash
# Install dependencies
npm install

# Run Unit Tests (Review 2 Test Suite):
npm test

# Start both Backend (Port 5000) and Frontend (Port 5173) simultaneously:
npm run dev
```

Then open your browser at **[http://localhost:5173](http://localhost:5173)**.

---

### Alternative: Run in 2 Separate Terminals

#### Terminal 1 — Backend (Express + SQLite)
```bash
cd backend
npm install
npm run dev
```
*API runs on `http://localhost:5000` with built-in SQLite database.*

#### Terminal 2 — Frontend (React + Vite + Tailwind CSS)
```bash
cd frontend
npm install
npm run dev
```
*Web application runs on `http://localhost:5173`.*

---

## 🔑 Role-Based Access Control (RBAC) & Default Credentials

| Role | Email | Password | Access Matrix & Permissions |
|------|-------|----------|-----------------------------|
| **Admin** | `admin@privacyanalytics.dev` | `admin123` | **Full Access**: Analytics, Workflows, Simulation, Accuracy Evaluation, Privacy Settings & Budget Reset, Event Clearing, Tenant Management, System Logs. |
| **Analyst** | `analyst@privacyanalytics.dev` | `analyst123` | **Analytical Access**: Journey Analytics, Reports, Workflows, DP Simulation, Comparison, and Accuracy Evaluation. Restricted from modifying system privacy parameters or clearing event streams. |
| **Demo** | `alice@techflow.com` | `password` | Quick Test Workspace. |

### RBAC Implementation Architecture
- **Backend Middleware**: Protected via `requireRole(['admin', 'analyst'])` and `requireAdmin` middleware in `backend/src/middleware/auth.js`. Unauthorized requests receive HTTP `403 Forbidden`.
- **Frontend Navigation Protection**: Navigation menu dynamically filters out unauthorized pages in `frontend/src/components/Layout.jsx`.
- **Route Guards**: `RoleRoute` in `frontend/src/App.jsx` intercepts unauthorized direct URL navigation and safely redirects users to `/dashboard`.

---

## 🎯 Accuracy Evaluation Module (Review 2 Priority)

Accessible at **`/accuracy-evaluation`** or via the sidebar navigation item **🎯 Accuracy Evaluation**.

### Key Capabilities:
1. **Actual vs. Differential Privacy Comparison**: Side-by-side empirical comparison of raw ground-truth user counts vs. Laplace-noised counts.
2. **Multi-Epsilon Evaluation**: Evaluates analytical accuracy systematically across $\epsilon \in \{0.1, 0.5, 1.0\}$:
   - **$\epsilon = 0.1$ (Very High Privacy)**: Theoretical expected error $\mathbb{E}[|X|] = 10.0$.
   - **$\epsilon = 0.5$ (High Privacy)**: Theoretical expected error $\mathbb{E}[|X|] = 2.0$.
   - **$\epsilon = 1.0$ (Standard Privacy)**: Theoretical expected error $\mathbb{E}[|X|] = 1.0$.
3. **Statistical Error Metrics**:
   - **Mean Absolute Error (MAE)**:
     $$\text{MAE} = \frac{1}{N} \sum_{i=1}^N |\text{Actual}_i - \text{Noisy}_i|$$
   - **Mean Relative Error (MRE)** & **Error Percentage**: Average percentage deviation across all journey funnel stages.
   - **Accuracy Percentage**: $\max(0, 100\% - \text{Error}\%)$.
4. **Interactive Visualizations (Chart.js)**:
   - **Funnel Stage Grouped Bar Chart**: Ground Truth vs. $\epsilon=0.1$, $\epsilon=0.5$, $\epsilon=1.0$.
   - **Privacy-Accuracy Tradeoff Line Chart**: Visualizes empirical MAE convergence toward theoretical scales.
5. **Stage Breakdown Table & CSV Export**: Detailed stage-by-stage counts, absolute noise added, and 1-click CSV report export.

---

## 🏢 Multi-Tenant Isolation Architecture

PrivacyLens implements safe tenant isolation without destructive database schema rebuilds:
- **Tenant Context in Authentication**: User JWT tokens embed verified `tenant_id` claims upon login.
- **Isolation Middleware**: `verifyTenantIsolation` middleware in `backend/src/routes/tenants.js` verifies that authenticated users can only access data belonging to their respective tenant workspace.
- **Cross-Tenant Protection**: Prevents cross-tenant leaks and blocks requests attempting to access or modify data from other organizations, returning HTTP `403 Forbidden`.

---

## 🧪 Unit Tests (Review 2 Suite)

PrivacyLens includes a comprehensive unit test suite using Node.js's native test runner (`node:test` and `node:assert/strict`).

Run all tests:
```bash
npm test
```

### Test Coverage Summary (20 Tests across 6 Suites):
1. **Laplace Noise Generation**:
   - Zero-centered noise verification ($\text{Mean} \approx 0$).
   - Inverse variance scaling (noise dispersion at $\epsilon=0.1$ is significantly larger than at $\epsilon=1.0$).
   - Rejection of invalid/non-positive sensitivity.
2. **Privacy Budget Calculations**:
   - Normal operation ($<50\%$ budget consumed).
   - Moderate warning ($50\% - 70\%$).
   - Warning threshold ($70\% - 90\%$).
   - Critical warning threshold ($\ge 90\%$).
3. **Epsilon Parameter Validation**:
   - Accepts valid positive floats and integers.
   - Rejects zero ($\epsilon = 0$).
   - Rejects negative values ($\epsilon < 0$).
   - Rejects NaN, Infinity, and non-numeric inputs.
4. **Small Cohort Edge Cases & Failure Warnings**:
   - Low traffic alert when cohort sessions $< 100$.
   - Selection bias alert when consent rate $< 50\%$.
   - Caution alert for extreme noise when $\epsilon < 0.1$.
   - Empty cohort array handling (returns 0 MAE and 100% accuracy without division by zero).
5. **Non-Negative Count Guarantee**:
   - Zero-bound enforcement: verifies across 500 trials with $\epsilon=0.05$ and actual count = 0 that noisy counts **never** drop below 0 ($\text{Noisy Count} \ge 0$).
6. **Multi-Epsilon Evaluation Pipeline**:
   - Accuracy and MAE computation across $\epsilon \in \{0.1, 0.5, 1.0\}$.
   - Verifies theoretical vs empirical error convergence.

---

## 🗄️ Database Schema (SQLite)

- `users`: User authentication accounts (`id`, `username`, `email`, `password_hash`, `role`).
- `workflows`: SaaS user journey definitions (`id`, `name`, `description`, `created_by`).
- `stages`: Sequential journey stages (`id`, `workflow_id`, `name`, `description`, `stage_order`).
- `sessions`: Fully anonymous sessions (`id [UUID]`, `workflow_id`, `started_at`, `completed_at`, `is_completed`, `consent_given`, `last_stage_reached`). **Zero PII is stored.**
- `events`: Stage entry events (`id`, `session_id`, `workflow_id`, `stage_id`, `stage_order`, `timestamp`).
- `privacy_settings`: Configurable DP parameters (`id`, `epsilon`, `privacy_mode`, `privacy_budget_used`, `privacy_budget_total`).
- `feedback`: User feedback stored locally (`id`, `user_name`, `rating`, `category`, `message`, `submitted_at`).
- `dp_experiments`: Log of measurable differential privacy trials (`id`, `workflow_id`, `epsilon`, `stage_name`, `actual_count`, `noisy_count`, `noise_added`).

---

## 🛠️ Technology Stack (Zero Docker / No WSL Needed)

- **Frontend**: React 18, Vite, Tailwind CSS, Chart.js, react-chartjs-2, React Router DOM, Heroicons.
- **Backend**: Node.js, Express, jsonwebtoken (JWT), bcryptjs.
- **Database**: SQLite (via Node's built-in `node:sqlite` module — requires zero C++ native compiling on Windows).
- **Deployment**: Local execution with `npm install`, `npm test`, and `npm run dev`.
