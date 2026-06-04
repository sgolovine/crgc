import { spawn } from "node:child_process";

export type SpawnFileOptions = {
  rejectOnError?: boolean;
};

export type SpawnFileResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

export async function spawnFile(
  command: string,
  args: string[],
  options: SpawnFileOptions = {}
): Promise<SpawnFileResult> {
  const rejectOnError = options.rejectOnError ?? true;

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");

    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", reject);

    child.on("close", (exitCode: number | null) => {
      const result = {
        exitCode: exitCode ?? 1,
        stdout,
        stderr
      };

      if (rejectOnError && result.exitCode !== 0) {
        reject(new Error(stderr.trim() || `${command} exited with code ${result.exitCode}.`));
        return;
      }

      resolve(result);
    });
  });
}
