import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export type OpenInSlicer = (file: string) => Promise<void>;

/**
 * Launches the slicer with a model file. On macOS `app` is an application
 * name for `open -a`; elsewhere it's the executable to run.
 */
export function slicerLauncher(app: string): OpenInSlicer {
  return async (file) => {
    if (process.platform === "darwin") {
      await run("open", ["-a", app, file]);
    } else {
      execFile(app, [file]).unref();
    }
  };
}
