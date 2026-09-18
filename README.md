# Motif Productivity Suite

[![Quality Pipeline](https://github.com/<Brandonflex >/<motif-productivity-suite/actions/workflows/ci.yml/badge.svg)](https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/actions)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![Vite](https://img.shields.io/badge/Vite-5.4-purple?logo=vite)

> A high-performance, responsive productivity suite engineered for fluid visual interaction, robust state management, and real-time execution.

[**Live Demo**](https://<YOUR_REPO_NAME>.vercel.app) | [**Report Issue**](https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>/issues)

---

## Key Features

- **Fluid Workspace UI:** Interactive dashboards built with dynamic drag-and-drop mechanics (`@dnd-kit`).
- **Data & Visualizations:** Interactive analytics powered by `recharts` and fluid layout transitions using `framer-motion`.
- **3D Interactive Elements:** Immersive scene rendering integrated via `@react-three/fiber` and `@react-three/drei`.
- **Strict Data Validation:** Type-safe schema validation powered by `zod` and `react-hook-form`.
- **Custom Design System:** Modular component architecture tailored with Tailwind CSS and `lucide-react` icons.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | React 19 (Vite, React Router v7) |
| **Language** | TypeScript (Strict mode enabled) |
| **Styling** | Tailwind CSS, Autoprefixer, Stylelint |
| **State & Forms** | React Hook Form, Zod, Custom Hooks |
| **Interactive** | `@dnd-kit/core`, `framer-motion`, `@react-three/fiber` |
| **Tooling & CI** | GitHub Actions, ESLint, Stylelint |

---

## Architecture & Quality Pipeline

Quality and stability are enforced programmatically rather than manually. Every commit triggers an automated **GitHub Actions CI Pipeline** running on Node.js 20 that enforces:

1. **Type Safety at the Boundaries:** Compiles TypeScript without emitting files (`tsc --noEmit`) to catch type mismatches early.
2. **Linting & Formatting:** Runs ESLint and Stylelint to enforce code patterns and design system CSS constraints.
3. **Static Build Verification:** Validates production bundle compilations and static file generation before merging into `main`.

---

## AI-Assisted Workflow & Speed Strategy

This project was developed leveraging modern **AI coding agents** (Windsurf / Codeium / local LLMs) to accelerate prototyping and component generation. 

- **Architectural Guardrails:** While AI tools handled repetitive setup, human oversight enforced clean separation of concerns, strict component interfaces, and modular layout structures.
- **Safety Net:** The automated CI pipeline acts as the ultimate filter, guaranteeing that AI-generated code never breaks type boundaries, introduces invalid CSS variables, or fails production builds.

---

## Getting Started

### Prerequisites
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher

### Installation

1. Clone the repository:
   ```bash
   git clone [https://github.com/](https://github.com/)<YOUR_GITHUB_USERNAME>/<YOUR_REPO_NAME>.git
   cd <YOUR_REPO_NAME>
