import BaseModule from './baseModule.js';
import { BStackLogger } from '../cliLogger.js';
import type { Options } from '@wdio/types';
export default class AutomateModule extends BaseModule {
    logger: typeof BStackLogger;
    browserStackConfig: Options.Testrunner;
    private sessionMap;
    static readonly MODULE_NAME = "AutomateModule";
    /**
     * Create a new AutomateModule
     */
    constructor(browserStackConfig: Options.Testrunner);
    getModuleName(): string;
    onBeforeTest(args: Record<string, unknown>): Promise<void>;
    /**
     * PUT the session's current name if it has not already been applied.
     * De-duped via `appliedName` so the onAfterExecute sweep does not re-send it.
     */
    private flushSessionName;
    onAfterTest(args: Record<string, unknown>): Promise<void>;
    onAfterExecute(): Promise<void>;
    private isAppAutomate;
    markSessionName(sessionId: string, sessionName: string, config: {
        user: string;
        key: string;
    }): Promise<void>;
    markSessionStatus(sessionId: string, sessionStatus: 'passed' | 'failed', sessionErrorMessage: string | undefined, config: {
        user: string;
        key: string;
    }): Promise<void>;
}
