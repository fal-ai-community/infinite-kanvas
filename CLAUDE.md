# Project Root - Infinite Kanvas

This is the main frontend application for Infinite Kanvas - an infinite canvas image editor with AI transformations and multiplayer collaboration.

## Project Structure

```
/
├── src/               # Next.js application source
├── party/             # PartyKit WebSocket server
├── docs/              # Project documentation
├── public/            # Static assets and fonts
├── wrangler.toml      # Cloudflare Workers configuration
├── package.json       # Dependencies and scripts
├── tailwind.config.ts # Tailwind CSS configuration
├── tsconfig.json      # TypeScript configuration
└── eslint.config.mjs  # ESLint configuration
```

## Key Technologies

- **Next.js 15**: React framework with App Router
- **React 19**: UI components and hooks
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives

## Development

```bash
# Install dependencies
pnpm install

# Start development (runs both Next.js and PartyKit)
npm run dev

# Build for production
npm run build

# Run linter
npm run lint
```

## Environment Variables

See README.md for required environment variables including:

- fal.ai API key (FAL_KEY)
- Clerk authentication
- Cloudflare services
- Application URLs

## Important Notes

- This project uses PartyKit for real-time multiplayer features
- AI integrations use fal.ai for image transformations
- Persistent storage uses Cloudflare D1, R2, and KV
- Authentication handled by Clerk with Clerk Elements
- Canvas rendering powered by React Konva

## Related Projects

- `packages/` - Any shared packages (if using monorepo)
- `docs/` - Complete project documentation
