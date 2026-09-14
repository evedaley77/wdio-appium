import type { Services, Capabilities, Options, Frameworks } from '@wdio/types';
import type { BrowserstackConfig, MultiRemoteAction } from './types.js';
import type { Pickle, Feature, ITestCaseHookParameter, CucumberHook } from './cucumber-types.js';
export default class BrowserstackService implements Services.ServiceInstance {
    private _caps;
    private _config;
    private _sessionBaseUrl;
    private _failReasons;
    private _hookFailReasons;
    private _pureTestFailReasons;
    private _scenariosThatRan;
    private _lastScenarioName?;
    private _scenariosRanCount;
    private _reloadHappened;
    private _failureStatuses;
    private _browser?;
    private _suiteTitle?;
    private _suiteFile?;
    private _fullTitle?;
    private _options;
    private _specsRan;
    private _observability;
    private _currentTest?;
    /**
     * CLI/gRPC path: map of test identity -> the test_uuid minted for it at
     * INIT_TEST/PRE. The CLI mints a fresh uuid into a SINGLE mutable per-worker tracked instance
     * (`trackWdioMochaInstance` overwrites `TestFramework.instances[ctxId]` wholesale on every
     * INIT_TEST), and the gRPC test-finish reads the uuid from that single slot. When a test hangs
     * past the mocha timeout, the NEXT test's INIT_TEST overwrites the slot before the hung test's
     * afterTest POST fires, so the POST would carry the wrong (next) test's uuid and the binary
     * would close the wrong test_run — orphaning the hung one. We snapshot each test's uuid here,
     * keyed by the same identity the legacy `_tests` map uses, and at afterTest we restore the
     * finishing test's minted uuid onto the tracked instance before the POST so it closes the
     * correct test_run. The finishing identity is `originalTest` (already snapshotted pre-await by
     * the testFnWrapper, so it is the timed-out runnable's own identity, not the next test's).
     */
    private _cliTestUuids;
    private _insightsHandler?;
    private _accessibility;
    private _accessibilityHandler?;
    private _customTagsHandler?;
    private _percy;
    private _percyCaptureMode;
    private _percyHandler?;
    private _turboScale;
    /**
     * Only mocha's own bail drops the rest of a spec. wdio's top-level `bail` is a launcher
     * spec-scheduling filter (it stops queueing further specs once N runners have failed) and
     * never reaches mocha, so under it every test in the current spec still runs — enumerating
     * on it would report tests as skipped that are about to execute.
     */
    private _mochaBail;
    constructor(options: BrowserstackConfig & Options.Testrunner, _caps: Capabilities.ResolvedTestrunnerCapabilities, _config: Options.Testrunner);
    _updateCaps(fn: (caps: WebdriverIO.Capabilities) => void): void;
    beforeSession(config: Omit<Options.Testrunner, 'capabilities'>, capabilities: WebdriverIO.Capabilities): Promise<void>;
    before(caps: Capabilities.ResolvedTestrunnerCapabilities, specs: string[], browser: WebdriverIO.Browser): Promise<void>;
    /**
     * Set the default job name at the suite level to make sure we account
     * for the cases where there is a long running `before` function for a
     * suite or one that can fail.
     * Don't do this for Jasmine because `suite.title` is `Jasmine__TopLevel__Suite`
     * and `suite.fullTitle` is `undefined`, so no alternative to use for the job name.
     */
    beforeSuite(suite: Frameworks.Suite): Promise<void>;
    beforeHook(test: Frameworks.Test | CucumberHook, context: unknown): Promise<void>;
    afterHook(test: Frameworks.Test | CucumberHook, context: unknown, result: Frameworks.TestResult): Promise<void>;
    beforeTest(test: Frameworks.Test): Promise<void>;
    afterTest(originalTest: Frameworks.Test, context: never, results: Frameworks.TestResult): Promise<void>;
    /**
     * Whether this failure will be retried, in which case mocha has not dropped anything yet and
     * the tests after it are still going to run.
     *
     * `results.retries` only tracks wdio's spec-file retries — `@wdio/utils` builds it as
     * `{ attempts: 0, limit: repeatTest }` and `@wdio/mocha-framework` never feeds `mochaOpts.retries`
     * into it, so under mocha-level retries it stays `{0, 0}` and tells us nothing. Read mocha's own
     * runnable state for that case, otherwise the cascade fires on the first attempt and reports
     * tests as skipped that the retry then actually runs.
     */
    private hasRetryPending;
    /**
     * mocha's `bail` aborts the run on the first failure, so every test the spec had not reached
     * yet is dropped without emitting any event and never appears on the dashboard. Report them
     * as skipped — same cascade the failed-hook path uses, from the spec's root suite so sibling
     * describes are covered too (bail kills the whole spec, not just the failing describe).
     *
     * The root can span more than one file when specs are grouped — `MochaAdapter` adds every spec
     * it is handed to one mocha instance. Cascading across them is still correct: bail aborts that
     * whole runner, so those tests do not run either.
     */
    private reportBailSkippedTests;
    after(result: number): Promise<void>;
    /**
     * For CucumberJS
     */
    beforeFeature(uri: string, feature: Feature): Promise<void>;
    /**
     * Runs before a Cucumber Scenario.
     * @param world world object containing information on pickle and test step
     */
    beforeScenario(world: ITestCaseHookParameter): Promise<void>;
    afterScenario(world: ITestCaseHookParameter): Promise<void>;
    beforeStep(step: Frameworks.PickleStep, scenario: Pickle): Promise<void>;
    afterStep(step: Frameworks.PickleStep, scenario: Pickle, result: Frameworks.PickleResult): Promise<void>;
    /**
     * Whether accessibility is being driven by the binary rather than the classic handler.
     *
     * Precisely: it decides whether the CLASSIC handler owns the session's accessibility state.
     * It is the same condition that gates `AccessibilityHandler.before()` in the `before` hook, so
     * keeping it in one place is what stops the two drifting.
     *
     * The two paths are not strictly exclusive. `AccessibilityModule` is registered on
     * `startBinResponse.accessibility?.success` alone, independent of provider — `isNonBstackA11y`
     * exists for exactly the turboscale / non-BrowserStack case — so with the binary up against a
     * non-BrowserStack provider the module can hold real state AND the handler's `before()` will
     * have run. Both then need migrating, which is what the caller does.
     *
     * `isRunning()` alone is NOT equivalent, and that is the trap: under a non-BrowserStack
     * provider it is true while the classic handler is the one holding the live state.
     */
    private _isCliAccessibilityFlow;
    onReload(oldSessionId: string, newSessionId: string): Promise<void>;
    _isAppAutomate(): boolean;
    _updateJob(requestBody: unknown): Promise<unknown>;
    _routeBidiExecutorToHttp(browser: WebdriverIO.Browser): void;
    _multiRemoteAction(action: MultiRemoteAction): Promise<unknown>;
    _update(sessionId: string, requestBody: unknown): Promise<void> | Promise<Response>;
    _printSessionURL(): Promise<void>;
    private _setSessionName;
    private _setAnnotation;
    private _executeCommand;
    private saveWorkerData;
}
