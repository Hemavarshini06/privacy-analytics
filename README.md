# 🔐 PrivacyLens — Privacy-Preserving Journey Analytics Tool

> **College Prototype Project**  
> A practical, lightweight, and complete full-stack web application demonstrating **Differential Privacy** in SaaS journey analytics.  
> Identifies workflow abandonment **without collecting any personal data (Zero PII)**.

---

## ⚡ 1-Step Quick Start

From the `privacy-analytics` root directory:

```bash
# Install dependencies (already pre-installed)
npm install

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

## 🔑 Default Login Credentials

Click any of the **Quick Fill** buttons on the Login page or use:

| Role    | Email                              | Password    | Access Level |
|---------|------------------------------------|-------------|--------------|
| **Admin**   | `admin@privacyanalytics.dev`         | `admin123`    | Full Access + Feedback Review |
| **Analyst** | `analyst@privacyanalytics.dev`       | `analyst123`  | Journey Analytics + Simulations |
| **Demo**    | `alice@techflow.com`                 | `password`    | Quick Test Workspace |

---

## 🎯 Project Overview & Core Features

| # | Page / Feature | Description |
|---|----------------|-------------|
| 1 | **Landing Page** (`/`) | Project overview, feature showcase, 3-step workflow, and zero-PII privacy guarantee. |
| 2 | **Login Page** (`/login`) | Simple JWT authentication with 1-click Quick Fill buttons for Admin & Analyst. |
| 3 | **Dashboard** (`/dashboard`) | Total Sessions, Completion Rate, Abandonment Rate, and dynamic Privacy Score. |
| 4 | **Workflow Builder** (`/workflows`) | Create, edit, delete, and reorder workflow stages without touching database directly. |
| 5 | **Event Generator** (`/events`) | Synthetic anonymous user generator (1000+ events) with configurable drop-off & consent rates. |
| 6 | **Analytics Page** (`/analytics`) | Interactive Chart.js visualizations: Funnel chart, Drop-off rate, Completion, and Consent distribution. |
| 7 | **Privacy Settings** (`/privacy`) | Epsilon slider ($\epsilon$), Privacy Mode toggle (Differential Privacy vs Aggregation), and Privacy Budget bar. |
| 8 | **DP Simulation** (`/simulation`) | Side-by-side comparison of Actual vs Noisy counts using Laplace noise mechanism. |
| 9 | **Baseline vs Privacy** (`/comparison`) | Interactive experiment runner measuring Accuracy %, Error %, and Noise impact across $\epsilon$ values. |
| 10 | **Reports Page** (`/reports`) | Export reports as CSV or download generated PDF executive summary. |
| 11 | **Feedback Page** (`/feedback`) | Feedback submission form stored in SQLite with community satisfaction ratings. |
| 12 | **Documentation** (`/docs`) | Architecture diagrams, complete DB schema, mathematical DP explanation, and failure case handling. |

---

## 🧮 Differential Privacy Formulation

```
Noisy Count = Actual Count + Laplace(0, 1 / ε)
```

- **Global Sensitivity ($\Delta f$)**: $1$ (a single user joining or leaving affects any stage count by at most 1).
- **Privacy Parameter ($\epsilon$)**: Lower $\epsilon$ gives higher privacy and more noise; higher $\epsilon$ gives higher utility.
- **Noise Sampling**: Implemented via inverse cumulative distribution function (CDF):
  $$X = -\frac{1}{\epsilon} \cdot \text{sgn}(U) \cdot \ln(1 - 2|U|), \quad U \sim \text{Uniform}(-0.5, 0.5)$$

---

## ⚠️ Handled Failure Cases

The system detects and alerts users to 3 critical analytical edge cases:
1. **Low Traffic Warning**: Triggered when total sessions $< 100$. (Noise may overpower small sample sizes).
2. **Low Consent Data Warning**: Triggered when consent rate $< 50\%$. (Analytics may suffer from selection bias).
3. **Very Small Epsilon Warning**: Triggered when $\epsilon < 0.1$. (Noise scale is extreme; counts may have high error).

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

- **Frontend**: React 18, Vite, Tailwind CSS, Chart.js, react-chartjs-2, React Router DOM, Headless UI / Heroicons.
- **Backend**: Node.js, Express, jsonwebtoken (JWT), bcryptjs.
- **Database**: SQLite (via Node's built-in `node:sqlite` module — requires zero C++ native compiling on Windows).
- **Deployment**: Local execution with `npm install` and `npm run dev`.
Note: This project is a college prototype designed for local execution and evaluation.

---

## 🧪 Verification & Evaluation Checklist

- [x] Runs locally without Docker, WSL, or Kubernetes.
- [x] Built-in SQLite database seeded with 1,000 synthetic anonymous sessions (3,700+ events).
- [x] All 12 requested pages implemented.
- [x] Differential Privacy applied to all count queries using Laplace mechanism.
- [x] Privacy budget tracking with visual progress bar and query history.
- [x] Baseline vs DP comparison module implemented.
- [x] CSV and PDF report export working.
- [x] Feedback form with SQLite persistence and rating breakdown.
- [x] Dark mode support throughout the application.
- [x] Detailed Documentation page with architecture, schema, and DP guide.
