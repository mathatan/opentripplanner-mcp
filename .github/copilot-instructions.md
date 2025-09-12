# Copilot Instructions for opentripplanner-mcp

## Project Overview

This repository is a TypeScript/Node.js backend project for OpenTripPlanner MCP. The main source code is in `src/`, with build artifacts in `build/`. The project uses Vitest for testing and pnpm for package management.

## Architecture & Major Components

- **Entry Point:** `src/index.ts` is the main entry file.
- **Tests:**
    - Unit tests: `tests/index.test.ts`
    - E2E tests: `tests/index.e2e.test.ts`
    - Legacy JS tests: `build/index.test.js`
- **Build Output:** Compiled JS files are in `build/`.
- **Config Files:**
    - TypeScript: `tsconfig.json`
    - Linting: `eslint.config.js`
    - Vitest: `vitest.config.ts`
    - Nodemon: `nodemon.json`

## Developer Workflows

- **Install dependencies:**
    ```sh
    pnpm install
    ```
- **Run tests:**
    ```sh
    pnpm test
    ```
- **Run linter:**
    ```sh
    pnpm lint
    ```
- **Start dev server (with auto-reload):**
    ```sh
    pnpm dev
    ```
- **Build project:**
    ```sh
    pnpm build
    ```

## Patterns & Conventions

- **Testing:**
    - Use Vitest for all new tests (`*.test.ts`). Legacy JS tests are in `build/`.
    - E2E tests are in `tests/index.e2e.test.ts`.
- **TypeScript:**
    - All source code should be in `src/` and use TypeScript.
    - Avoid placing new code in `build/`.
- **Linting:**
    - Use the rules in `eslint.config.js`.
- **Package Management:**
    - Use pnpm, not npm or yarn.

## Integration Points

- No external service integrations are detected in the codebase structure. Check `src/index.ts` for API or service connections.

## Examples

To add a new test, create `tests/yourfile.test.ts` and use Vitest syntax.

- To debug, use `pnpm dev` for hot-reloading via nodemon.

## Key Files

- `src/index.ts` (main logic)
- `tests/index.test.ts`, `tests/index.e2e.test.ts` (tests)
- `eslint.config.js`, `tsconfig.json`, `vitest.config.ts`, `nodemon.json` (configs)

---

**Feedback:** If any section is unclear or missing, please specify what needs improvement or what additional context is required.
