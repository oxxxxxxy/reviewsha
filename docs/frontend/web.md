# Web application

`apps/web` — пользовательский React 19/Vite application.

## Routes

Основные routes включают login/register, dashboard, projects, project upload,
analysis, reports, chat и settings. Protected routes требуют authenticated
state; при refresh failure пользователь возвращается на login.

## Feature flow

```text
route/page
  → query/mutation hook
  → @reviewsha/sdk
  → API
```

Каждая async page имеет loading, empty, error и success state. Mutation должна
инвалидировать соответствующие query keys и не создавать duplicate requests.

## Chat UI

Chat uses REST for history/session and dedicated typed SSE client for streaming.
`delta/token` events append to a pending assistant message; `complete` commits
final state; `error` closes pending state and exposes retry.

## Project detail actions

The project detail page keeps the primary workflow in one action row:

```text
Project settings · Delete project · Start analysis · Open reports · Open chat
```

Project history and archive controls are intentionally not exposed in this
view. Upload versions and the current analysis status remain available below
the action row.

## Commands

```bash
yarn workspace @reviewsha/web dev
yarn workspace @reviewsha/web test
yarn workspace @reviewsha/web typecheck
yarn workspace @reviewsha/web build
```
