/**
 * Auto-starts the Django backend alongside the Next.js dev/standalone server.
 * The sandbox guarantees `bun run dev` is running — this makes Django part of
 * the same boot sequence so the CMS is always reachable through the proxy.
 * The heavy lifting lives in instrumentation-node.ts (Node runtime only —
 * the file-name convention keeps it out of the Edge bundle).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const mod = await import("./instrumentation-node");
  await mod.register();
}
