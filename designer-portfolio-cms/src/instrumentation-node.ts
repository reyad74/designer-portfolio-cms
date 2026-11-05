/**
 * Boots Django when the Node.js server starts (never bundled for Edge).
 * See src/instrumentation.ts for the runtime guard.
 */
export async function register() {
  const net = await import("node:net");
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { spawn } = await import("node:child_process");

  const ROOT = process.cwd();
  const BACKEND_DIR = path.join(ROOT, "backend");
  const PY = path.join(BACKEND_DIR, ".venv", "bin", "python");
  const HOST = "127.0.0.1";
  const PORT = Number(process.env.DJANGO_PORT || 8000);

  const probe = () =>
    new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host: HOST, port: PORT });
      const done = (ok: boolean) => {
        socket.destroy();
        resolve(ok);
      };
      socket.once("connect", () => done(true));
      socket.once("error", () => done(false));
      socket.setTimeout(1000, () => done(false));
    });

  if (await probe()) return; // already running

  if (!fs.existsSync(PY)) {
    console.warn("[instrumentation] backend/.venv missing — Django backend NOT started");
    return;
  }

  console.log(`[instrumentation] starting Django backend on ${HOST}:${PORT}`);
  const logFd = fs.openSync(path.join(BACKEND_DIR, "django.log"), "a");
  const child = spawn(PY, ["manage.py", "runserver", `${HOST}:${PORT}`, "--noreload"], {
    cwd: BACKEND_DIR,
    detached: true,
    stdio: ["ignore", logFd, logFd],
    env: { ...process.env, PYTHONUNBUFFERED: "1" },
  });
  child.unref();

  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
    if (await probe()) {
      console.log("[instrumentation] Django backend ready");
      return;
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  console.warn("[instrumentation] Django backend did not become ready in time");
}
