import { IMAGE_EXT } from "@/lib/events";
import type { EventFiles } from "./draft";
import type { FileChange } from "./save";

// Server only: the one place that talks to GitHub with GITHUB_TOKEN.

export type GitHubConfig = {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  apiUrl: string;
  /** Injected in tests. */
  fetch?: typeof fetch;
};

export class GitHubError extends Error {}

const MAX_COMMIT_ATTEMPTS = 3;

function repoName(cfg: GitHubConfig) {
  return `${cfg.owner}/${cfg.repo}`;
}

async function errorFor(cfg: GitHubConfig, res: Response): Promise<GitHubError> {
  const body = (await res.json().catch(() => ({}))) as { message?: string };
  if (res.status === 401) {
    return new GitHubError(
      "GitHub rejected GITHUB_TOKEN (wrong or expired). Create a new token and update it in Vercel."
    );
  }
  if (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0") {
    return new GitHubError("GitHub's rate limit was reached. Try again in a few minutes.");
  }
  if (res.status === 403) {
    return new GitHubError(
      `GITHUB_TOKEN isn't allowed to do this. On ${repoName(cfg)} it needs "Contents: Read and write" and "Commit statuses: Read-only".`
    );
  }
  if (res.status === 404) {
    return new GitHubError(`GitHub can't find ${repoName(cfg)}, or GITHUB_TOKEN has no access to it.`);
  }
  return new GitHubError(`GitHub error ${res.status}: ${body.message ?? res.statusText}`);
}

async function request(
  cfg: GitHubConfig,
  method: string,
  path: string,
  body?: unknown,
  accept = "application/vnd.github+json"
): Promise<Response> {
  const res = await (cfg.fetch ?? fetch)(`${cfg.apiUrl}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${cfg.token}`,
      accept,
      "x-github-api-version": "2022-11-28",
      "user-agent": "sfl-romania-admin",
      ...(body === undefined ? {} : { "content-type": "application/json" })
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });
  return res;
}

async function json<T>(cfg: GitHubConfig, method: string, path: string, body?: unknown): Promise<T> {
  const res = await request(cfg, method, path, body);
  if (!res.ok) throw await errorFor(cfg, res);
  return (await res.json()) as T;
}

const repoPath = (cfg: GitHubConfig) => `/repos/${cfg.owner}/${cfg.repo}`;

// ---------------------------------------------------------------------------
// Reading

/** One event folder as stored on GitHub. */
export type RepoEvent = {
  slug: string;
  files: Partial<EventFiles>;
  /** Image filenames in images/, sorted like the site's loader sorts them. */
  images: string[];
  /** Every file in the folder, for deleting the event. */
  paths: string[];
};

type TreeEntry = {
  name: string;
  type: string;
  object?: { text?: string | null; entries?: TreeEntry[] } | null;
};

const EVENTS_QUERY = `query($owner: String!, $repo: String!, $expr: String!) {
  repository(owner: $owner, name: $repo) {
    object(expression: $expr) {
      ... on Tree {
        entries {
          name
          type
          object {
            ... on Tree {
              entries {
                name
                type
                object {
                  ... on Blob { text }
                  ... on Tree { entries { name type } }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

const FILE_KEYS: Record<string, keyof EventFiles> = {
  "event.json": "eventJson",
  "ro.mdx": "roMdx",
  "en.mdx": "enMdx"
};

/** Every event folder with its text files, in one GraphQL request. */
export async function readEvents(cfg: GitHubConfig): Promise<RepoEvent[]> {
  const res = await request(cfg, "POST", "/graphql", {
    query: EVENTS_QUERY,
    variables: { owner: cfg.owner, repo: cfg.repo, expr: `${cfg.branch}:content/events` }
  });
  if (!res.ok) throw await errorFor(cfg, res);
  const body = (await res.json()) as {
    data?: { repository?: { object?: { entries?: TreeEntry[] } | null } | null } | null;
    errors?: { type?: string; message: string }[];
  };
  if (body.errors?.length) {
    const notFound = body.errors.some((e) => e.type === "NOT_FOUND");
    throw new GitHubError(
      notFound
        ? `GitHub can't find ${repoName(cfg)}, or GITHUB_TOKEN has no access to it.`
        : `GitHub error: ${body.errors[0].message}`
    );
  }

  const folders = body.data?.repository?.object?.entries ?? [];
  return folders
    .filter((f) => f.type === "tree" && !f.name.startsWith("_"))
    .map((f) => {
      const base = `content/events/${f.name}`;
      const event: RepoEvent = { slug: f.name, files: {}, images: [], paths: [] };
      for (const entry of f.object?.entries ?? []) {
        if (entry.type === "tree") {
          for (const inner of entry.object?.entries ?? []) {
            if (inner.type !== "blob") continue;
            event.paths.push(`${base}/${entry.name}/${inner.name}`);
            if (entry.name === "images" && IMAGE_EXT.test(inner.name)) event.images.push(inner.name);
          }
          continue;
        }
        event.paths.push(`${base}/${entry.name}`);
        const key = FILE_KEYS[entry.name];
        if (key && typeof entry.object?.text === "string") event.files[key] = entry.object.text;
      }
      event.images.sort();
      return event;
    });
}

/** Raw bytes of one file on the branch (used for admin thumbnails). */
export async function readRaw(cfg: GitHubConfig, path: string): Promise<ArrayBuffer> {
  const encoded = path.split("/").map(encodeURIComponent).join("/");
  const res = await request(
    cfg,
    "GET",
    `${repoPath(cfg)}/contents/${encoded}?ref=${encodeURIComponent(cfg.branch)}`,
    undefined,
    "application/vnd.github.raw+json"
  );
  if (!res.ok) throw await errorFor(cfg, res);
  return res.arrayBuffer();
}

// ---------------------------------------------------------------------------
// Writing

/** Stores a photo in the repository's object database; a later commit references it. */
export async function uploadBlob(cfg: GitHubConfig, base64: string): Promise<string> {
  const blob = await json<{ sha: string }>(cfg, "POST", `${repoPath(cfg)}/git/blobs`, {
    content: base64,
    encoding: "base64"
  });
  return blob.sha;
}

/** One commit on the branch with all `changes`; returns the new commit's sha. */
export async function commitChanges(
  cfg: GitHubConfig,
  message: string,
  changes: FileChange[]
): Promise<string> {
  const repo = repoPath(cfg);
  const tree = changes.map((c) => ({ mode: "100644", type: "blob", ...c }));

  for (let attempt = 1; attempt <= MAX_COMMIT_ATTEMPTS; attempt++) {
    const ref = await json<{ object: { sha: string } }>(cfg, "GET", `${repo}/git/ref/heads/${cfg.branch}`);
    const head = ref.object.sha;
    const headCommit = await json<{ tree: { sha: string } }>(cfg, "GET", `${repo}/git/commits/${head}`);
    const newTree = await json<{ sha: string }>(cfg, "POST", `${repo}/git/trees`, {
      base_tree: headCommit.tree.sha,
      tree
    });
    const commit = await json<{ sha: string }>(cfg, "POST", `${repo}/git/commits`, {
      message,
      tree: newTree.sha,
      parents: [head]
    });

    const res = await request(cfg, "PATCH", `${repo}/git/refs/heads/${cfg.branch}`, {
      sha: commit.sha,
      force: false
    });
    if (res.ok) return commit.sha;
    if (res.status !== 422) throw await errorFor(cfg, res);
    // "Update is not a fast forward": something was pushed since we read the
    // head, so rebuild on top of it. Other 422s (branch protection, rulesets)
    // won't go away by retrying.
    const { message: reason = "" } = (await res.json().catch(() => ({}))) as { message?: string };
    if (!/fast.forward/i.test(reason)) throw new GitHubError(`GitHub refused the change: ${reason}`);
  }
  throw new GitHubError("The site was changed by someone else at the same moment. Try saving again.");
}

// ---------------------------------------------------------------------------
// Deploy status

export type DeployState = "waiting" | "publishing" | "live" | "failed";

/** Vercel reports each deployment as a commit status named "Vercel". */
export async function deployStatus(
  cfg: GitHubConfig,
  sha: string
): Promise<{ state: DeployState; url: string | null }> {
  const combined = await json<{ statuses: { context: string; state: string; target_url: string | null }[] }>(
    cfg,
    "GET",
    `${repoPath(cfg)}/commits/${encodeURIComponent(sha)}/status`
  );
  // The deployment itself reports as "Vercel" (or "Vercel – <project>"); other
  // Vercel checks such as "Vercel Preview Comments" succeed immediately.
  const vercel =
    combined.statuses.find((s) => s.context === "Vercel") ??
    combined.statuses.find((s) => /^Vercel/.test(s.context) && !/comments/i.test(s.context));
  if (!vercel) return { state: "waiting", url: null };
  const state: DeployState =
    vercel.state === "success" ? "live" : vercel.state === "pending" ? "publishing" : "failed";
  return { state, url: vercel.target_url };
}
