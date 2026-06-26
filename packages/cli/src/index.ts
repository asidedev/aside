#!/usr/bin/env node
import { Command } from "commander";
import { CLI_VERSION } from "./config.js";

const program = new Command();

program
  .name("aside")
  .description("Developer microcuriosities in the Claude Code status line")
  .version(CLI_VERSION);

program
  .command("status")
  .description("Print the current curiosity (invoked by the status line). Local-only, synchronous.")
  .action(async () => {
    const { runStatus } = await import("./commands/status.js");
    runStatus();
  });

program
  .command("install")
  .description("Register the Aside status line in ~/.claude/settings.json (non-destructive).")
  .option("--force", "overwrite an existing non-Aside status line")
  .action(async (opts: { force?: boolean }) => {
    const { runInstall } = await import("./commands/install.js");
    await runInstall(opts);
  });

program
  .command("uninstall")
  .description("Remove the Aside status line and ~/.aside/.")
  .action(async () => {
    const { runUninstall } = await import("./commands/uninstall.js");
    runUninstall();
  });

program
  .command("about")
  .description("Print exactly what Aside reads, sends, and never does.")
  .action(async () => {
    const { runAbout } = await import("./commands/about.js");
    runAbout();
  });

program
  .command("sync")
  .description("(internal) Refresh the cache and flush impressions. Run detached.")
  .action(async () => {
    const { runSyncCommand } = await import("./commands/sync.js");
    await runSyncCommand();
  });

program
  .command("wrap", { isDefault: false })
  .description("(experimental) Run `claude` and show a curiosity in the thinking spinner.")
  .allowUnknownOption(true)
  .allowExcessArguments(true)
  .argument("[args...]", "arguments passed through to claude")
  .action(async (args: string[]) => {
    const { runWrap } = await import("./commands/wrap.js");
    await runWrap(args ?? []);
  });

program.parseAsync(process.argv).catch(() => {
  // Never let a CLI error leak a stack trace into a status line render.
  process.exitCode = 1;
});
