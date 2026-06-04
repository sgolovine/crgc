import { select } from "@clack/prompts";
import type { GitConfigEntry, GitConfigOption, OptionResult } from "../types.js";
import { cancelIfNeeded } from "../utils/cancel.js";

export type LineEndingPreset = "mac-linux" | "windows" | "preserve";

export function buildCoreLineEndingEntries(preset: LineEndingPreset): GitConfigEntry[] {
  if (preset === "windows") {
    return [
      {
        key: "core.autocrlf",
        value: "true",
        description: "Converts LF to CRLF on checkout and CRLF back to LF when files are committed."
      },
      {
        key: "core.eol",
        value: "crlf",
        description: "Checks text files out with CRLF line endings."
      }
    ];
  }

  if (preset === "preserve") {
    return [
      {
        key: "core.autocrlf",
        value: "false",
        description: "Disables automatic line-ending conversion."
      }
    ];
  }

  return [
    {
      key: "core.autocrlf",
      value: "input",
      description: "Converts CRLF to LF on commit while leaving checked-out files as LF."
    },
    {
      key: "core.eol",
      value: "lf",
      description: "Checks text files out with LF line endings."
    }
  ];
}

export const coreLineEndingsOption: GitConfigOption = {
  id: "core-line-endings",
  label: "Line endings",
  hint: "Set how Git normalizes LF and CRLF text files.",
  async configure(): Promise<OptionResult> {
    const preset = cancelIfNeeded(
      await select<LineEndingPreset>({
        message: "How should Git handle text file line endings in this project?",
        options: [
          { value: "mac-linux", label: "LF for macOS/Linux", hint: "Recommended for most cross-platform repos." },
          { value: "windows", label: "CRLF for Windows", hint: "Checkout CRLF while storing LF in commits." },
          { value: "preserve", label: "Preserve files", hint: "Turn off automatic conversion." }
        ]
      })
    );

    return {
      entries: buildCoreLineEndingEntries(preset),
      summary: "Configured line-ending behavior."
    };
  }
};
