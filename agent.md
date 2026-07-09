# Project Agent Reference

## Purpose
This file is a short project reference for the NVS Bookstore monorepo. It is intended to help future reviewers and agents understand the workspace quickly without re-analyzing the full project every time.

## Strict Update Rule
- **Strict requirement:** Update this `agent.md` file after any successful codebase changes only after the user has reviewed the changes and confirmed them.
- Do not treat this file as automatically current after edits. It must be refreshed manually when the codebase changes and the user approves.

## Project Summary
NVS Bookstore is a mono-repo e-commerce platform built with a microservices backend and a Next.js frontend.

### Root Stack
- `pnpm` workspaces managed by `package.json` and `pnpm-workspace.yaml`
- `turbo` orchestrates dev/build/test across packages and services
- `Dockerfile.*` and `docker-compose.yml` for container orchestration
- Shared packages under `packages/`

## Top-level Workspace Layout
- `apps/web/` — Next.js frontend application
- `services/read-service/` — read-optimized Express service
- `services/transaction-service/` — transactional operations and payments
- `services/admin-service/` — admin management, uploads, and file handling
- `services/worker-service/` — background processing and event consumers
- `packages/auth/` — shared authentication middleware
- `packages/database/` — shared MongoDB connection and models
- `packages/logger/` — shared logging utilities
- `infrastructure/` — deployment helpers for MinIO, MongoDB replica init, and nginx

## Important Files
- `package.json` — root workspace scripts and dependency entry point
- `pnpm-workspace.yaml` — workspace package definitions
- `docker-compose.yml` — local orchestration for services and infrastructure
- `apps/web/package.json` — frontend dependencies and scripts
- `services/*/package.json` — each service dependency and runtime scripts
- `packages/*/package.json` — shared package definitions
- `README.md` — user-facing project overview and setup guidance
- `.gitignore` — files/directories excluded from source control

## Backend Service Overview
- `read-service`: uses `express`, `redis`, `@sarkari/database`, `@sarkari/logger`
- `transaction-service`: handles payments, authentication, order writes, uses `amqplib`, `bcryptjs`, `razorpay`
- `admin-service`: handles uploads and management, uses `mongoose`, `multer`, `redis`, `amqplib`
- `worker-service`: handles emails and PDF generation, uses `nodemailer`, `pdfkit`, `amqplib`

## Frontend Overview
- `apps/web/` is a Next.js 16 frontend targeting React 19
- Uses Tailwind CSS 4, Radix UI, Tiptap editor, Framer Motion, and other UI utilities

## Exclusion Guidance for Code Extraction
When generating `code.md` or reviewing the repository, exclude:
- `node_modules/`
- `.git/`
- `.turbo/`
- `dist/`, `build/`, `.next/`, `out/`
- `logs/`
- compiled or generated build artifacts
- environment files such as `.env`, `.env.local`, and `.env*.local`
- binary assets not needed for code review

## Code Extraction Tool
Use the companion script `code.js` to generate `code.md` with relative paths and file contents from the project root.
- The script excludes unneeded directories and files.
- It is intended for quick reference and should be run from the root of the project.

## Usage Notes
- Prefer reviewing `apps/web/` for frontend changes.
- Prefer reviewing `services/*/src/` and `packages/*` for backend and shared logic changes.
- Always validate changes with the user before updating this reference.
