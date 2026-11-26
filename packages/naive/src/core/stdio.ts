// Stdout and stderr to a pipe are asynchronous in Node once the pipe's buffer is full, so a CLI that prints more
// than the reader has taken and then calls process.exit drops the rest. `naive routes` was cut at 65,536 bytes that
// way, and agents reading it through a pipe concluded that routes past the cut did not exist. blockingStdio() makes
// both block when they are pipes, so every write is whole before the process exits. A TTY or a file is left as it is.

/** Makes stdout and stderr block when they are pipes. Call it once, first thing in a CLI's entry module. */
export function blockingStdio(): void {
  for (const stream of [process.stdout, process.stderr]) {
    const handle: unknown = Reflect.get(stream, "_handle");
    if (typeof handle !== "object" || handle === null) continue;
    const setBlocking: unknown = Reflect.get(handle, "setBlocking");
    if (typeof setBlocking === "function") setBlocking.call(handle, true);
  }
}
