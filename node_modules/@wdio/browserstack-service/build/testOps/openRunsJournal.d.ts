import type { TestData } from '../types.js';
export declare const ORPHAN_FAILURE_REASON = "Test run did not complete: the process was interrupted or terminated before the test finished (finalized by BrowserStack SDK exit cleanup)";
export declare function recordOpenRun(testData: TestData): void;
export declare function clearOpenRun(uuid?: string): void;
export declare function collectOrphanedRuns(): TestData[];
export declare function finalizeOrphanedRuns(): Promise<number>;
