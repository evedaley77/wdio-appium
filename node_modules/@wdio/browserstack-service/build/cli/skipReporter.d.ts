import type { Frameworks } from '@wdio/types';
import type TestFramework from './frameworks/testFramework.js';
export declare function markTestStarted(identifier: string): void;
export declare function drainSkipReports(): Promise<void>;
export declare function reportSkippedTest(framework: TestFramework, identifier: string, test: Frameworks.Test, suiteTitle?: string): Promise<void>;
/**
 * Port of the legacy insights-handler skip propagation: when a BEFORE_ALL/BEFORE_EACH/
 * AFTER_EACH hook fails (or skips), mocha silently drops the remaining tests in the
 * suite — report each state-undefined test as skipped, recursing into nested describes.
 */
export declare function reportSuiteSkipped(framework: TestFramework, suite: {
    tests?: unknown[];
    suites?: unknown[];
}): Promise<void>;
/** Resolve a spec file path usable by the binary (it rejects events with no location). */
export declare function resolveSpecFile(candidate: string | undefined, runnerSpec: string | undefined): string | undefined;
