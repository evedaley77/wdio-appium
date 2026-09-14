import type { Frameworks } from '@wdio/types';
import type { BeforeCommandArgs, AfterCommandArgs } from '@wdio/reporter';
import type { Feature, Scenario, CucumberHook, CucumberHookParams, Pickle, ITestCaseHookParameter } from './cucumber-types.js';
import type { BrowserstackConfig, BrowserstackOptions } from './types.js';
import type { TestData, TestMeta, CurrentRunInfo, StdLog, CBTData } from './types.js';
import type { Capabilities } from '@wdio/types';
declare class _InsightsHandler {
    private _browser;
    private _framework?;
    private _tests;
    private _hooks;
    private _platformMeta;
    private _commands;
    private _gitConfigPath?;
    private _suiteFile?;
    static currentTest: CurrentRunInfo;
    private _currentHook;
    private _cucumberData;
    private _userCaps?;
    private _options?;
    private listener;
    currentTestId: string | undefined;
    cbtQueue: Array<CBTData>;
    private readonly _ltsActive;
    private readonly _ltsSessionId;
    constructor(_browser: WebdriverIO.Browser | WebdriverIO.MultiRemoteBrowser, _framework?: string | undefined, _userCaps?: Capabilities.ResolvedTestrunnerCapabilities, _options?: BrowserstackConfig & BrowserstackOptions);
    _isAppAutomate(): boolean;
    registerListeners(): void;
    setSuiteFile(filename: string): void;
    before(): Promise<void>;
    getCucumberHookType(test: CucumberHook | undefined): string | null;
    getCucumberHookName(hookType: string | undefined): string;
    getCucumberHookUniqueId(hookType: string, hook: CucumberHook | undefined): string | null;
    getCucumberFeatureUniqueId(): string;
    setCurrentHook(hookDetails: CurrentRunInfo): void;
    getCurrentHook(): CurrentRunInfo;
    sendScenarioObjectSkipped(scenario: Scenario, feature: Feature, uri: string): Promise<void>;
    processCucumberHook(test: CucumberHook | undefined, params: CucumberHookParams, result?: Frameworks.TestResult): Promise<void>;
    beforeHook(test: Frameworks.Test | CucumberHook | undefined, context: unknown): Promise<void>;
    afterHook(test: Frameworks.Test | CucumberHook | undefined, result: Frameworks.TestResult): Promise<void>;
    getHookRunDataForCucumber(hookData: TestMeta, eventType: string, result?: Frameworks.TestResult): TestData;
    beforeTest(test: Frameworks.Test): Promise<void>;
    afterTest(test: Frameworks.Test, result: Frameworks.TestResult): Promise<void>;
    /**
     * Teardown safety net: synthesise a terminal finish for any started-but-unfinished
     * test/hook so the backend closes the entity instead of leaving it in_progress and
     * letting the build watchdog inflate the duration.
     *
     * Covers mocha and cucumber. Cucumber entries are keyed by hook-definition id / scenario
     * unique id rather than title, but both stash kind + identity at start time, so the same
     * kind-tag scan closes them (SDK-7167: an AFTER_EACH hook whose finish was never emitted
     * held the hook open until the backend's 2h hook timeout, inflating the build duration).
     *
     * Each entry was tagged with kind at start time so we emit HookRunFinished for hooks and
     * TestRunFinished for tests without re-deriving the kind from the title. Entries without a
     * uuid are skipped (same null-uuid guard as afterTest): a finish the backend can't match to a
     * start is worse than none. The result is marked failed/incomplete via getFailureObject so the
     * entity lands in a terminal state rather than pending.
     */
    sweepUnfinished(): Promise<void>;
    /**
     * Build a terminal (failed/incomplete) finish payload for a swept entry directly from the
     * stashed TestMeta, since the live framework test object is no longer available at teardown.
     */
    private buildSweepFinishData;
    /**
      * Cucumber Only
      */
    beforeFeature(uri: string, feature: Feature): Promise<void>;
    beforeScenario(world: ITestCaseHookParameter): Promise<void>;
    afterScenario(world: ITestCaseHookParameter): Promise<void>;
    beforeStep(step: Frameworks.PickleStep, scenario: Pickle): Promise<void>;
    afterStep(step: Frameworks.PickleStep, scenario: Pickle, result: Frameworks.PickleResult): Promise<void>;
    /**
     * misc methods
     */
    appendTestItemLog: (stdLog: StdLog) => Promise<void>;
    browserCommand(commandType: string, args: BeforeCommandArgs | AfterCommandArgs, test?: Frameworks.Test | ITestCaseHookParameter): Promise<void>;
    /**
     * Check if any test steps failed (excluding hook failures)
     * This is used when ignoreHooksStatus is true to determine test status based only on test steps
     */
    hasTestStepFailures(world: ITestCaseHookParameter): boolean;
    private attachHookData;
    private setHooksFromSuite;
    private getHierarchy;
    private getRunData;
    private getTestRunId;
    private getTestRunIdFromSuite;
    private getTestRunDataForCucumber;
    flushCBTDataQueue(): Promise<void>;
    sendCBTInfo(): Promise<void>;
    private getIntegrationsObject;
    private getIdentifier;
    setGitConfigPath(): Promise<void>;
    setTestData(test: Frameworks.Test, uuid: string): void;
}
declare const InsightsHandler: typeof _InsightsHandler;
type InsightsHandler = _InsightsHandler;
export default InsightsHandler;
