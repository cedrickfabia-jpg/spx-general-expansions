// Vitest/Vite on some Windows sandboxes cannot spawn child processes for the
// `net use` realpath probe. This preload neutralizes that one probe call.
const cp = require("child_process");
const noop = () => {};
cp.exec = function exec(_command, _options, callback) {
  if (typeof _options === "function") callback = _options;
  const target = callback;
  if (target) process.nextTick(() => target(null, ""));
  return { on: noop, once: noop, emit: noop, stdout: null, stderr: null, pid: -1, kill: noop };
};
