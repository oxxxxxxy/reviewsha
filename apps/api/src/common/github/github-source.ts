export interface GithubRepositoryReference {
  readonly owner: string;
  readonly repo: string;
  readonly url: string;
}

/** Parse and canonicalize a public GitHub repository URL. */
export function parseGithubRepositoryUrl(value: string): GithubRepositoryReference | null {
  try {
    const parsed = new URL(value.trim());
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (
      parsed.protocol !== 'https:' ||
      parsed.hostname.toLowerCase() !== 'github.com' ||
      parts.length !== 2 ||
      parsed.search ||
      parsed.hash
    ) {
      return null;
    }
    const owner = parts[0]!.trim();
    const repo = parts[1]!.replace(/\.git$/i, '').trim();
    if (!owner || !repo) return null;
    return { owner, repo, url: `https://github.com/${owner}/${repo}` };
  } catch {
    return null;
  }
}
