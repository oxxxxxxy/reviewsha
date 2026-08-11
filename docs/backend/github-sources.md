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

The operation is idempotent by commit SHA. Repeating it only downloads commits
that are not already present. A connected project checks for new commits when
its project page is opened, on window focus, and every 60 seconds while the
page remains open.

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

The repository must be publicly readable because the current integration uses
the public GitHub API and does not store GitHub credentials.
