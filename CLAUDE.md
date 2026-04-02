
Default to using Bun instead of Node.js.

- Use `bun <file>` instead of `node <file>` or `ts-node <file>`
- Use `bun test` instead of `jest` or `vitest`
- Use `bun build <file.html|file.ts|file.css>` instead of `webpack` or `esbuild`
- Use `bun install` instead of `npm install` or `yarn install` or `pnpm install`
- Use `bun run <script>` instead of `npm run <script>` or `yarn run <script>` or `pnpm run <script>`
- Use `bunx <package> <command>` instead of `npx <package> <command>`
- Bun automatically loads .env, so don't use dotenv.

## APIs

- `Bun.serve()` supports WebSockets, HTTPS, and routes. Don't use `express`.
- `bun:sqlite` for SQLite. Don't use `better-sqlite3`.
- `Bun.redis` for Redis. Don't use `ioredis`.
- `Bun.sql` for Postgres. Don't use `pg` or `postgres.js`.
- `WebSocket` is built-in. Don't use `ws`.
- Prefer `Bun.file` over `node:fs`'s readFile/writeFile
- Bun.$`ls` instead of execa.

## Testing

Use `bun test` to run tests.

```ts#index.test.ts
import { test, expect } from "bun:test";

test("hello world", () => {
  expect(1).toBe(1);
});
```

## Frontend

Use HTML imports with `Bun.serve()`. Don't use `vite`. HTML imports fully support React, CSS, Tailwind.

Server:

```ts#index.ts
import index from "./index.html"

Bun.serve({
  routes: {
    "/": index,
    "/api/users/:id": {
      GET: (req) => {
        return new Response(JSON.stringify({ id: req.params.id }));
      },
    },
  },
  // optional websocket support
  websocket: {
    open: (ws) => {
      ws.send("Hello, world!");
    },
    message: (ws, message) => {
      ws.send(message);
    },
    close: (ws) => {
      // handle close
    }
  },
  development: {
    hmr: true,
    console: true,
  }
})
```

HTML files can import .tsx, .jsx or .js files directly and Bun's bundler will transpile & bundle automatically. `<link>` tags can point to stylesheets and Bun's CSS bundler will bundle.

```html#index.html
<html>
  <body>
    <h1>Hello, world!</h1>
    <script type="module" src="./frontend.tsx"></script>
  </body>
</html>
```

With the following `frontend.tsx`:

```tsx#frontend.tsx
import React from "react";
import { createRoot } from "react-dom/client";

// import .css files directly and it works
import './index.css';

const root = createRoot(document.body);

export default function Frontend() {
  return <h1>Hello, world!</h1>;
}

root.render(<Frontend />);
```

Then, run index.ts

```sh
bun --hot ./index.ts
```

For more information, read the Bun API docs in `node_modules/bun-types/docs/**.mdx`.

## Merge Procedure

- Always merge pull requests using **Squash and Merge** (`--squash`)
- Never `--delete-branch` — the repo auto-deletes merged branches
- Always sync main after merge

```bash
gh pr merge <number> --squash
git checkout main && git pull
```

### Branch Full Flow

```bash
git checkout -b <type>/<name>
# ... commits ...
git push -u origin <type>/<name>
gh pr create --title "<title>" --body "<body>"
gh pr merge <number> --squash
git checkout main && git pull
```

## Release Procedure

- Never `git push --tags` — pushes all local tags including unintended ones
- Never create git tags for RC versions — tag only stable releases
- Pushing a `v*.*.*` tag triggers two workflows automatically: `publish.yml` (npm) and `release.yml` (GitHub Release)
- Working tree must be clean before `bun pm version`

### Auto-Tag Flow

When a PR with a version bump in `package.json` is merged to `main`, the `auto-tag.yml` workflow:
1. Detects the version change
2. Generates a short tag message via Claude Haiku (falls back to empty if API unavailable)
3. Creates and pushes the annotated tag automatically

**No manual tag creation needed.** Just bump the version and merge.

### Stable Release

```bash
bun pm version <x.y.z>
git checkout -b release/v<x.y.z>
git push -u origin release/v<x.y.z>
gh pr create --title "chore: release v<x.y.z>" --body "..."
gh pr merge <number> --squash
# wait for merge confirmation, then:
git checkout main && git pull
# auto-tag.yml creates the tag; publish.yml and release.yml trigger automatically
```

### RC / Pre-release

```bash
bun pm version prerelease --preid rc
bun run release --tag next
# commit + push via PR — NO git tag for RCs
```

### dist-tags

| Tag | Use |
|-----|-----|
| `latest` | stable releases (published by `publish.yml` on tag push) |
| `next` | RC / pre-release (published manually with `bun run release --tag next`) |

### Claude Review Workflow

`claude-review.yml` has 3 jobs: `wait-for-ci` (polls CI up to 10 min), `notify-failure` (posts PR comment on CI failure/timeout), `review` (runs Claude after CI passes).
- Do NOT change the trigger to `workflow_run` — `track_progress` breaks in that mode (`AutomationContext` has no `entityNumber`)
- Test the pre-commit hook with `sh .husky/pre-commit`, not `bun x husky`

## Project Architecture

```
src/
├── index.ts          # Public re-exports for everything below
├── base-either.ts    # Abstract base classes (BaseEither, BaseLeft, BaseRight) and shared interfaces (EitherMatch, EitherOn)
├── either.ts         # Either<L,R>, Left, Right — sync Either with overloaded transform/andThen/toMaybe; left() and right() constructors
├── async-either.ts   # AsyncEither<L,R> — promise-based Either wrapper with the same chainable API
├── from.ts           # from() — overloaded entry point: Promise<Either> → AsyncEither, Promise<Maybe> → AsyncMaybe
├── base-maybe.ts     # Abstract base classes (BaseMaybe, BaseJust, BaseNothing) and shared interfaces (MaybeMatch, MaybeOn)
├── maybe.ts          # Maybe<T>, Just<T>, Nothing — sync Maybe with overloaded transform/andThen/filter/toEither; maybe(), just(), nothing() constructors
├── async-maybe.ts    # AsyncMaybe<T> — promise-based Maybe wrapper with the same chainable API
├── result.ts         # Result<T,E> type alias over Either<E,T>; ok() and err() constructors
├── attempt.ts        # attempt(fn, mapError?) — unified try/catch wrapper; auto-detects sync/async; returns Either or AsyncEither
└── try.ts            # trySync() / tryAsync() — simple try/catch wrappers returning Either / Promise<Either>
```

Test files are co-located with source as `*.spec.ts`.
