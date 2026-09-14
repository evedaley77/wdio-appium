import type { Options } from '@wdio/types';
export interface CapturedFile {
    name: string;
    sourcePath: string;
    content: string;
}
export interface ConfigPathResolution {
    configPath?: string;
    strategy?: string;
    reason?: string;
}
/**
 * cwd-relative form of a FILE path, for anything that gets uploaded.
 *
 * The basename fallback is safe here only because `path.relative` is never empty for a file —
 * a file is never equal to cwd. Do NOT pass a directory: see `relativeDirToCwd`.
 */
export declare const relativeToCwd: (filePath: string) => string;
/**
 * cwd-relative form of a DIRECTORY path.
 *
 * `path.relative(cwd, cwd)` is `''`, which is the COMMON case here (a manifest at the project
 * root), so a basename fallback would report the folder name — and for a project checked out
 * directly in `$HOME` that folder name is the OS username, which is the exact exposure the
 * relative-path handling exists to prevent. Empty means "cwd", so render it as `.`.
 */
export declare const relativeDirToCwd: (dir: string) => string;
/**
 * Resolve the absolute path of the user's wdio config file.
 *
 * WDIO keeps the real path in `ConfigParser`'s private `#configFilePath`, which no service can
 * reach, so this reconstructs it from the values the CLI does leave on the merged config —
 * mirroring how `@wdio/cli` itself resolves it. The CLI never searches: it takes one candidate
 * and probes one stem across the supported extensions, so neither does this.
 *
 *   1. BROWSERSTACK_WDIO_CONFIG_FILE_PATH  — explicit override / support escape hatch
 *   2. config['config-path']               — yargs' kebab alias of the `run <configPath>`
 *                                            positional (v8 and v9 alike)
 *   3. config._[0]                         — the bare `wdio <config>` form, which `run.ts`
 *                                            itself resolves from `params._[0]`
 *   4. rootDir + wdio.conf.<ext>           — no-arg `wdio`, and programmatic `new Launcher()`
 *   5. cwd + wdio.conf.<ext>               — when the user overrides `rootDir` in their config
 *
 * `config._` is read rather than raw `process.argv`: it is the same positional AFTER yargs has
 * applied wdio's own option declarations. Scanning argv means re-implementing that with a
 * heuristic that cannot know which flags are boolean — and `wdio --watch ./a.conf.ts` puts the
 * real config in `_[0]` while any "skip a flag's value" rule throws it away.
 */
export declare function resolveWdioConfigPath(config?: Options.Testrunner): ConfigPathResolution;
/**
 * Resolve once, as early as possible, and publish the answer on the environment so the
 * upload path (and any worker) reads the SAME value instead of re-deriving it from cwd.
 *
 * Re-resolving at archive time is precisely the bug SDK-5993 fixed in the Node SDK: the
 * archive step read `cwd/browserstack.yml` while startup had resolved a different path,
 * silently dropping the config for every monorepo / subdir CI run.
 */
export declare function initWdioConfigPath(config?: Options.Testrunner): ConfigPathResolution;
/**
 * Opt-out for auto-captured logs. Service option first, env var as the CI escape hatch
 * (customers cannot always edit a committed config). Name matches the Node SDK's
 * `disableAutoCaptureLogs` so the flag means the same thing across BrowserStack SDKs.
 */
export declare function isAutoCaptureLogsDisabled(options?: {
    disableAutoCaptureLogs?: boolean;
}): boolean;
/**
 * Mirror the service option onto the environment so the opt-out survives into the
 * DETACHED cleanup process, which gets no options object.
 *
 * Without this the opt-out is worse than useless: skipping the upload leaves
 * `logsUploaded` false, which is exactly the condition that arms the exit-time
 * `--uploadLogs` rescue — so every opted-out run had its config read and POSTed by the
 * cleanup child. Returns whether auto-capture is disabled.
 */
export declare function publishAutoCaptureDisabled(options?: {
    disableAutoCaptureLogs?: boolean;
}): boolean;
/**
 * Line-level credential scrub, ported from the Node SDK's `redactSensitiveContent`.
 *
 * Any line mentioning a sensitive key collapses to `<key>: [REDACTED]`. Word boundaries
 * keep `hotkey` / `keyword` from tripping the bare `key` entry that WDIO's top-level
 * credential options force us to carry. `.` is intentionally NOT part of the boundary
 * class so `bstackOptions.accessKey = '...'` still matches.
 */
export declare function redactSensitiveContent(text: string): string;
/**
 * Give every archive entry a unique name. Two configs can share a basename
 * (`configs/wdio.conf.ts` + `shared/wdio.conf.ts`); without this the second silently
 * overwrites the first, since archive entries are keyed by basename.
 *
 * Shared with `uploadLogs`, which de-dupes the copied log files against these entries —
 * one implementation so the two can never disagree.
 */
export declare function dedupeEntryName(filePath: string, taken: Set<string>): string;
/**
 * Build the redacted config entries added to the auto-captured log archive.
 *
 * Best effort by contract: any failure returns what was gathered so far and a reason
 * string for the SDK_UPLOAD_LOGS event. It must never throw — a debug artifact is never
 * worth failing a customer's test run over.
 */
export declare function collectConfigFilesForUpload(config?: Options.Testrunner): {
    files: CapturedFile[];
    failures: string[];
    strategy?: string;
};
/**
 * `package.json` for the project the config belongs to — framework and service versions
 * are the first thing triage needs, and the archive carried neither before.
 *
 * Walks UP from the config's directory, because `configs/wdio.conf.ts` (a very common
 * layout) puts the manifest one or more levels above the config, not beside it.
 * Archived verbatim: it is a manifest, not a secret store.
 */
export declare function findPackageJsonForUpload(): string | undefined;
