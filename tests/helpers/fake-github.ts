// In-memory stand-in for the parts of the GitHub REST/GraphQL API the admin uses.
// Response bodies carry the documented fields the client reads, plus the usual
// neighbours (url, node_id...) so partial-parsing bugs don't hide.

type Json = Record<string, unknown>;
export type Call = { method: string; path: string; body: Json | null; headers: Headers };

export function fakeGitHub(
  options: { status?: number; graphql?: Json; statuses?: Json[]; refRejection?: string } = {}
) {
  const API = "https://api.test";
  let n = 0;
  const id = (prefix: string) => (prefix + String(++n)).padEnd(40, "0");
  const commits = new Map<string, { tree: string; parents: string[] }>();
  const initialHead = "c".repeat(40);
  const initialTree = "t".repeat(40);
  let head = initialHead;
  commits.set(head, { tree: initialTree, parents: [] });
  const calls: Call[] = [];
  const trees: Json[] = [];
  /** How many times "someone else" pushes right before one of our ref updates. */
  let concurrentPushes = 0;

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" }
    });

  const fetchImpl = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const body = init.body ? (JSON.parse(String(init.body)) as Json) : null;
    const path = url.pathname;
    calls.push({ method, path, body, headers: new Headers(init.headers) });

    if (options.status) {
      return json(options.status, {
        message: "Bad credentials",
        documentation_url: "https://docs.github.com/rest"
      });
    }

    if (method === "POST" && path === "/graphql") return json(200, options.graphql ?? { data: null });

    if (method === "GET" && path === "/repos/o/r/git/ref/heads/main") {
      return json(200, {
        ref: "refs/heads/main",
        node_id: "REF",
        url: API + path,
        object: { sha: head, type: "commit", url: "" }
      });
    }

    const commitGet = path.match(/^\/repos\/o\/r\/git\/commits\/(\w+)$/);
    if (method === "GET" && commitGet) {
      const c = commits.get(commitGet[1])!;
      return json(200, {
        sha: commitGet[1],
        node_id: "C",
        url: "",
        message: "m",
        tree: { sha: c.tree, url: "" },
        parents: c.parents.map((sha) => ({ sha, url: "" }))
      });
    }

    if (method === "POST" && path === "/repos/o/r/git/trees") {
      trees.push(body!);
      return json(201, { sha: id("tree"), url: "", tree: body!.tree, truncated: false });
    }

    if (method === "POST" && path === "/repos/o/r/git/commits") {
      const sha = id("cmt");
      const parents = body!.parents as string[];
      commits.set(sha, { tree: String(body!.tree), parents });
      return json(201, {
        sha,
        node_id: "C",
        url: "",
        message: body!.message,
        tree: { sha: body!.tree, url: "" },
        parents: parents.map((p) => ({ sha: p, url: "" }))
      });
    }

    if (method === "PATCH" && path === "/repos/o/r/git/refs/heads/main") {
      if (options.refRejection) return json(422, { message: options.refRejection });
      if (concurrentPushes > 0) {
        concurrentPushes--;
        const other = id("othr");
        commits.set(other, { tree: "u".repeat(40), parents: [head] });
        head = other;
      }
      const target = String(body!.sha);
      // Like GitHub: force skips the fast-forward check (and loses the other push).
      if (body!.force !== true && !commits.get(target)?.parents.includes(head)) {
        return json(422, { message: "Update is not a fast forward" });
      }
      head = target;
      return json(200, {
        ref: "refs/heads/main",
        node_id: "REF",
        url: "",
        object: { sha: head, type: "commit", url: "" }
      });
    }

    if (method === "POST" && path === "/repos/o/r/git/blobs") {
      return json(201, { sha: id("blob"), url: "" });
    }

    const status = path.match(/^\/repos\/o\/r\/commits\/(\w+)\/status$/);
    if (method === "GET" && status) {
      const statuses = options.statuses ?? [];
      return json(200, {
        state: "pending",
        sha: status[1],
        total_count: statuses.length,
        statuses
      });
    }

    return json(404, { message: "Not Found" });
  };

  return {
    config: {
      owner: "o",
      repo: "r",
      branch: "main",
      token: "tok",
      apiUrl: API,
      fetch: fetchImpl as typeof fetch
    },
    calls,
    trees,
    initialHead,
    initialTree,
    head: () => head,
    commit: (sha: string) => commits.get(sha),
    pushConcurrently: (times: number) => {
      concurrentPushes = times;
    }
  };
}
