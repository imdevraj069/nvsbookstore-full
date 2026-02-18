# My Sarkari E-commerce Platform

A modern monorepo architecture for a Sarkari (Government) exam results and e-commerce platform built with microservices.

## Architecture

- **Packages**: Shared libraries (`database`, `logger`)
- **Services**: Microservices (read-service, transaction-service, admin-service, worker-service)
- **Apps**: Frontend applications (web with Next.js)
- **Infrastructure**: Docker orchestration and configurations

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start infrastructure:
   ```bash
   docker-compose up -d
   ```

3. Run development servers:
   ```bash
   pnpm dev
   ```

## Directory Structure

See each service's README for specific setup instructions.
