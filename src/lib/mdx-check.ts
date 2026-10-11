import { compile } from "@mdx-js/mdx";

/**
 * Compiles `source` the way the event page does and returns why it would break
 * the build ("line N: reason"), or null when it compiles.
 */
export async function mdxProblem(source: string): Promise<string | null> {
  try {
    await compile(source);
    return null;
  } catch (e) {
    const err = e as { line?: number; reason?: string; message: string };
    const reason = err.reason ?? err.message.split("\n")[0];
    return err.line ? `line ${err.line}: ${reason}` : reason;
  }
}
