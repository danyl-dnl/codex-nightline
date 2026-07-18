import { spawn } from "node:child_process";

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const processes = [
  spawn(process.execPath, ["server.js"], { stdio: "inherit" }),
  spawn(npmCommand, ["--prefix", "frontend", "run", "dev"], { stdio: "inherit" }),
];

let shuttingDown = false;
const shutdown = (exitCode = 0) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) child.kill("SIGTERM");
  process.exit(exitCode);
};

process.on("SIGINT", () => shutdown());
process.on("SIGTERM", () => shutdown());

for (const child of processes) {
  child.on("exit", (code) => {
    if (!shuttingDown) shutdown(code ?? 1);
  });
}
