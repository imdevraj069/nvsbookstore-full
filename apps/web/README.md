# Sarkari E-commerce Web Application

The Next.js 14+ frontend application for the Sarkari E-commerce platform with App Router support.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Project Structure

```
src/
├── app/              # App Router pages
│   ├── layout.tsx   # Root layout
│   ├── page.tsx     # Home page
│   ├── results/     # Exam results pages
│   └── shop/        # Shop pages
├── components/      # React components
│   ├── ui/         # UI components
│   └── forms/      # Form components
└── lib/            # Utilities and API clients
    ├── api.ts      # API fetchers
    └── utils.ts    # Helper functions
```

## Development

Edit pages and components to update the application. The page auto-updates as you edit the files.

## Building

Build for production:

```bash
pnpm build
pnpm start
```

## Technologies

- Next.js 14+ with App Router
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion for animations
