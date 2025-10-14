# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` React TypeScript; UI modules in `src/components/`, routes in `src/pages/`, state in `src/store/`, logic in `src/lib/` and `src/hooks/`.
- `backend/` Express API with Claude orchestration; handlers live in `src/routes/`, adapters in `src/assistant/` and `src/mcp/`, helpers in `src/github/` and `src/middleware/`.
- `mcp-servers/` houses schema analyzer, pattern library, model generator, and databricks optimizer workspaces; each keeps its own `package.json`, `src/`, and `__tests__/`.
- `supabase/` SQL migrations and RLS policies; apply them before auth flows or integration tests.
- `docs/`, `SETUP.md`, and `ARCHITECTURE.md` offer onboarding and system flow references; link to them when expanding features.

## Build, Test, and Development Commands
- Install dependencies once with `npm install`; all workspaces share the root lockfile.
- `npm run dev` launches frontend (Vite) and backend (tsx); add `npm run dev:mcp` for live MCP tooling.
- `npm run build --workspaces` compiles every package; `npm test`, `npm run test:watch`, and `npm run test:coverage` fan out across workspaces, with `--workspace=<name>` for focused runs.

## Coding Style & Naming Conventions
- Prettier enforces 2 space indentation, single quotes, trailing commas, and LF endings; run `npx prettier --check .` before pushing.
- ESLint (`frontend/.eslintrc.cjs`) expects hooks prefixed with `use`, components PascalCase, utilities camelCase, and env vars SCREAMING_SNAKE_CASE.
- Keep types in `*.types.ts`, colocate tests in `__tests__/` using `.test.ts`, and swap `console.log` for structured logging helpers.

## Testing Guidelines
- Frontend uses Vitest plus Testing Library; backend and MCP servers run on Jest with shared setup in `frontend/src/test/test-utils.ts`.
- Hold coverage above 80 percent for statements and lines and 75 percent for branches; investigate any CI drop before merging.
- Mock Supabase, Anthropic, and GitHub clients with `vi.mock` or `jest.mock`, and stage integration scenarios under `backend/src/__tests__/` with `.env.test` credentials.

## Commit & Pull Request Guidelines
- Write short, present tense commit subjects (for example `tighten databricks optimizer heuristics`) scoped to one concern and workspace.
- In PRs describe the change and motivation, link the task or issue, attach test output or screenshots, and flag migrations or env updates.
- Route reviews to owners of touched surfaces (frontend, backend, MCP) and include doc links when architecture shifts.

## Security & Configuration
- Copy `.env.example` to `.env`, keep secrets out of git, and rotate keys before demos.
- Restrict Supabase service keys to backend contexts and retire temporary Anthropic keys after MCP load testing; update `metadata/` descriptors when capabilities change.
