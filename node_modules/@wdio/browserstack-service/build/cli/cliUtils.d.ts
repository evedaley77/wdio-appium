import fs from 'node:fs';
import type { Options, Capabilities } from '@wdio/types';
import type { BrowserstackConfig, BrowserstackOptions, TestObservabilityOptions } from '../types.js';
export declare class CLIUtils {
    static automationFrameworkDetail: {};
    static testFrameworkDetail: {};
    static CLISupportedFrameworks: string[];
    static isDevelopmentEnv(): boolean;
    static getCLIParamsForDevEnv(): Record<string, string>;
    /**
     * Build config object for binary session request
     * @returns {string}
     * @throws {Error}
     */
    static getBinConfig(config: Options.Testrunner, capabilities: Capabilities.RequestedStandaloneCapabilities | Capabilities.RequestedStandaloneCapabilities[], options: BrowserstackConfig & BrowserstackOptions, buildTag?: string): string;
    static getSdkVersion(): string;
    static getSdkLanguage(): string;
    static setupCliPath(config: Options.Testrunner): Promise<string | null>;
    static checkAndUpdateCli(existingCliPath: string, cliDir: string, config: Options.Testrunner): Promise<string | null>;
    static getCliDir(): string;
    static getWritableDir(): string | null | undefined;
    static getExistingCliPath(cliDir: string): string;
    static isBinaryBusy(binaryPath: string): boolean;
    static requestToUpdateCLI: (queryParams: Record<string, string>, config: Options.Testrunner) => Promise<any>;
    static runShellCommand(cmdCommand: string, workingDir?: string): Promise<string>;
    /**
     * Version encoded in a binary download URL, e.g.
     * `.../binary-macos-arm64-1.48.0.zip` -> `1.48.0`. Null when the URL does
     * not carry one (custom BROWSERSTACK_BINARY_URL).
     */
    static getVersionFromBinaryUrl(binDownloadUrl: string): string | null;
    /**
     * Whether the binary on disk is already the version we were asked to fetch.
     * A peer worker winning the download race leaves the *target* version here;
     * a merely-pre-existing binary is stale. Only the former may short-circuit
     * the download — see `downloadLatestBinary`.
     */
    static isBinaryAtVersion(binaryPath: string, expectedVersion: string | null): Promise<boolean>;
    static downloadLatestBinary: (binDownloadUrl: string, cliDir: string, expectedVersion?: string | null) => Promise<string | null>;
    static downloadFileStream(downloadedFileStream: fs.WriteStream, zipFilePath: string, cliDir: string, resolve: (path: string) => void, reject: (reason?: Error) => void): void;
    static getTestFrameworkDetail(): any;
    static getAutomationFrameworkDetail(): any;
    static setFrameworkDetail(testFramework: string, automationFramework: string): void;
    /**
     * Get the current instance name using thread id and processId
     * @returns {string}
     */
    static getCurrentInstanceName(): string;
    /**
     * Generate a unique client worker identifier combining thread ID and process ID.
     * This identifier is used to track worker-specific events and performance metrics
     * across distributed test execution. Format matches the Python SDK implementation
     * for consistency across SDKs.
     *
     * Format: "threadId-processId"
     *
     * @param context - Optional execution context with threadId and processId
     * @returns Worker ID string in format "threadId-processId"
     * @example
     * const workerId = CLIUtils.getClientWorkerId() // Returns "1-12345"
     * const workerId = CLIUtils.getClientWorkerId({ threadId: 123, processId: 456 }) // Returns "123-456"
     */
    static getClientWorkerId(context?: {
        threadId?: string | number;
        processId?: string | number;
    }): string;
    /**
     *
     * @param {TestFrameworkState | AutomationFrameworkState} frameworkState
     * @param {HookState} hookState
     * @returns {string}
     */
    static getHookRegistryKey(frameworkState: State, hookState: State): string;
    static matchHookRegex(hookState: string): boolean;
    static getObservabilityBuildTags(observabilityOptions: TestObservabilityOptions, bstackBuildTag?: string): string[];
    static checkCLISupportedFrameworks(framework: string | undefined): boolean;
}
