## Purpose

Help AI coding agents be productive in this repo by documenting architecture, developer workflows, and code patterns observed in this project.

## Big picture

- This repo is a minimal Sui dApp with two parts:
  - `frontend/`: React + TypeScript + Vite UI using `@mysten/dapp-kit` to talk to Sui RPCs.
  - `supplychain/`: Move package (Move.toml) with placeholder module and Move tests under `supplychain/tests`.

## Key files (use these for context)

- Frontend entry and network wiring: `frontend/src/main.tsx` and `frontend/src/networkConfig.ts`
- UI patterns and wallet integration: `frontend/src/App.tsx`, `frontend/src/WalletStatus.tsx`, `frontend/src/OwnedObjects.tsx`
- Frontend scripts and dependencies: `frontend/package.json` and `frontend/README.md`
- Move package: `supplychain/Move.toml`, sources: `supplychain/sources/supplychain.move`, tests: `supplychain/tests/supplychain_tests.move`

## Architecture & integration points (specifics)

- Wallet & Sui client: `main.tsx` wraps the app with `SuiClientProvider networks={networkConfig}` and `WalletProvider` from `@mysten/dapp-kit`. Default network is `testnet`.
- Network config: `networkConfig` is created via `createNetworkConfig(...)` (see `networkConfig.ts`) which uses `getFullnodeUrl` from `@mysten/sui/client`.
- Data fetching: components use `useSuiClientQuery` (example: `OwnedObjects.tsx`) and React Query (`@tanstack/react-query`) — keep queries idempotent and enable them conditionally using the `enabled` option when depending on wallet state.

## Developer workflows (concrete commands)

- Frontend (recommended):

```bash
cd frontend
pnpm install
pnpm dev    # starts vite dev server
pnpm build  # runs `tsc && vite build` per package.json
```

- Move package (use Sui Move toolchain installed locally):

```bash
# from repo root or supplychain/
# common workflows: build and run tests with the Sui toolchain
sui move build
sui move test
```

Note: Move files are minimal / placeholders in `supplychain/` — tests are present but commented.

## Project-specific conventions & patterns

- Use `@mysten/dapp-kit` hooks for wallet and RPC interactions: `useCurrentAccount`, `useSuiClientQuery`, `SuiClientProvider`, `WalletProvider`.
- The UI displays wallet state in `WalletStatus.tsx`; owned objects are fetched in `OwnedObjects.tsx` with `getOwnedObjects` RPC via `useSuiClientQuery`:

  - Example pattern: `useSuiClientQuery("getOwnedObjects", { owner: account?.address }, { enabled: !!account })`.

- Network default: code sets `defaultNetwork="testnet"` in `main.tsx` — prefer testnet for local development unless explicitly switching.
- Build pipeline: `frontend/package.json` runs `tsc` before `vite build`, so TypeScript errors will block the build step.

## What to change carefully

- Avoid changing `networkConfig` shape; many components import it directly. If adding networks, update both `networkConfig.ts` and the `defaultNetwork` use-site in `main.tsx`.
- Frontend depends on exact package scripts (`dev`, `build`) in `frontend/package.json`; CI or automation should call those scripts rather than invoking Vite or tsc directly.

## How to run and debug locally (hints)

- To debug frontend UI, run `pnpm dev` and open the Vite dev URL. Wallet connect flows require a browser wallet (or the dApp-kit autoConnect behavior) — check `WalletProvider autoConnect` in `main.tsx`.
- To inspect RPC calls, add logging around `useSuiClientQuery` call sites (e.g., `OwnedObjects.tsx`) or enable network tracing in the browser devtools.

## When to ask the user

- If a proposed code change modifies network defaults, wallet initialization, or data-fetching patterns, ask: "Should `defaultNetwork` remain `testnet` and should `autoConnect` stay enabled?"
- If Move modules are updated, ask which named addresses (in `Move.toml` `[addresses]`) should be used for deployment/testing.

## Quick references

- Frontend README: `frontend/README.md`
- Package manifest: `frontend/package.json`
- Network wiring: `frontend/src/networkConfig.ts` and `frontend/src/main.tsx`

---
If any of the above sections are unclear or you want more details (CI, linters, or adding codegen rules), tell me what to expand or provide missing CI/scripts to reference.
