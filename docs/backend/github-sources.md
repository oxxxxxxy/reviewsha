# GitHub project sources

Projects can use a public GitHub repository as their immutable source of review
versions. A connected project stores the canonical repository URL and branch on
the `Project` record.

## Connecting a repository

Set the repository URL and branch when creating a project, or update an empty
project from **Project settings**. The backend normalizes URLs to:

```text
https://github.com/{owner}/{repository}
```

The branch defaults to `HEAD` when it is not supplied.

## Commit versions

`POST /api/v1/projects/:projectId/uploads/github` synchronizes the selected
branch through the GitHub commits API. Each imported commit is stored as an
immutable project version with:

- commit SHA;
- commit message and timestamp;
- repository URL;
- a ZIP archive of that exact commit.

The operation is idempotent by normalized (lowercase) commit SHA. Repeating it
only downloads commits that are not already present; duplicate entries returned
by GitHub in one response are also collapsed before any archive is downloaded.
The database has an active-project uniqueness guard for GitHub commit hashes,
which also protects concurrent sync requests. A connected project checks for new commits when
its project page is opened, on window focus, and every 60 seconds while the
page remains open.

Versions are returned in chronological commit order (oldest commit first),
using the GitHub commit timestamp. An existing duplicate is removed by the
deduplication migration while retaining the oldest imported copy.

## Reviewing any commit

Every completed GitHub version can be selected in the project’s **Versions**
list and passed to `POST /api/v1/projects/:projectId/analyses` as `uploadId`.
The analysis pipeline then reads the archive for that commit, so the report is
about the selected repository state rather than only the current branch head.

## Upload policy

Manual multipart uploads are rejected with `409 Conflict` while a GitHub source
is connected. GitHub versions are immutable and cannot be deleted through the
upload delete endpoint. This prevents a project’s version history from mixing
local files and repository commits.

To switch source type, create a new project. A repository URL or branch cannot
be changed after versions have been imported.

## API response fields

Upload responses expose the source metadata:

```json
{
  "sourceType": "GITHUB",
  "sourceCommit": "<sha>",
  "sourceRepo": "https://github.com/owner/repository",
  "sourceMessage": "Commit message",
  "sourceCommittedAt": "2026-08-12T12:00:00.000Z"
}
```

For public repositories no credential is required. Deployments may optionally
provide `GITHUB_TOKEN` through the API secret. The token is never sent to the
browser or stored on a Project; it is used only for GitHub API requests to
raise rate limits and to access repositories permitted by that token. If the
token is absent, public imports fall back to GitHub's Atom commit feed when the
REST API quota is exhausted.
