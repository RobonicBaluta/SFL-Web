import { routing } from "./routing";

export type RouteKey = keyof typeof routing.pathnames;

/** Extracts the `[param]` names out of a route template. */
type ParamNames<P extends string> = P extends `${string}[${infer Name}]${infer Rest}`
  ? Name | ParamNames<Rest>
  : never;

/** A route key together with the dynamic params that key requires (if any). */
export type MatchedRoute = {
  [K in RouteKey]: [ParamNames<K>] extends [never]
    ? { pathname: K }
    : { pathname: K; params: Record<ParamNames<K>, string> };
}[RouteKey];

/** Route params as handed out by `useParams()`. */
type RouteParams = Record<string, string | string[] | undefined>;

const ROUTE_KEYS = Object.keys(routing.pathnames) as RouteKey[];

/** Splits a pathname into its non-empty segments. */
function segments(pathname: string): string[] {
  return pathname.split("/").filter((s) => s !== "");
}

/** The internal template plus every localized template for a route key. */
function templatesFor(key: RouteKey): string[] {
  const config: string | Record<string, string> = routing.pathnames[key];
  return [key, ...(typeof config === "string" ? [config] : Object.values(config))];
}

function isPlaceholder(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]");
}

function paramValue(value: string | string[] | undefined): string | undefined {
  if (value === undefined) return undefined;
  const single = Array.isArray(value) ? value.join("/") : value;
  return single === "" ? undefined : single;
}

/**
 * Tries to fill `template`'s params from `actual` segments and `params`.
 * Returns null when the template does not describe this pathname.
 */
function fill(
  template: string,
  actual: string[],
  params: RouteParams
): Record<string, string> | null {
  const parts = segments(template);
  if (parts.length !== actual.length) return null;

  const filled: Record<string, string> = {};
  for (const [i, part] of parts.entries()) {
    const segment = actual[i];
    if (!isPlaceholder(part)) {
      if (part !== segment) return null;
      continue;
    }
    const name = part.slice(1, -1);
    // `usePathname()` yields the route template on non-rewritten routes, so the
    // segment itself can be a placeholder; `useParams()` has the real value.
    const value = paramValue(params[name]) ?? (isPlaceholder(segment) ? undefined : segment);
    if (value === undefined) return null;
    filled[name] = value;
  }
  return filled;
}

/**
 * Maps the current pathname back to its route key plus dynamic params, so it
 * can be handed to `Link`/`getPathname` for any locale.
 *
 * `next-intl`'s `usePathname()` is not consistent across routes: on a route
 * that the middleware did not rewrite it returns the route template
 * (`/evenimente/[slug]`), while on a rewritten one it returns the concrete
 * internal pathname (`/evenimente/my-event`). Both shapes — and localized
 * pathnames such as `/events/my-event` — are accepted here. Pass `useParams()`
 * so template pathnames can be resolved to real values. Unknown paths fall
 * back to the home route.
 */
export function matchRoute(pathname: string, params: RouteParams = {}): MatchedRoute {
  const actual = segments(pathname);

  for (const key of ROUTE_KEYS) {
    for (const template of templatesFor(key)) {
      const filled = fill(template, actual, params);
      if (!filled) continue;
      return (
        Object.keys(filled).length > 0 ? { pathname: key, params: filled } : { pathname: key }
      ) as MatchedRoute;
    }
  }

  return { pathname: "/" };
}
