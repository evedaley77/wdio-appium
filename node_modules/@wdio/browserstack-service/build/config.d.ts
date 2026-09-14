import type { AppConfig, BrowserstackConfig } from './types.js';
import type { Capabilities, Options } from '@wdio/types';
import TestOpsConfig from './testOps/testOpsConfig.js';
declare class BrowserStackConfig {
    static getInstance(options?: BrowserstackConfig & Options.Testrunner, config?: Options.Testrunner, capabilities?: Capabilities.TestrunnerCapabilities): BrowserStackConfig;
    userName?: string;
    accessKey?: string;
    framework?: string;
    buildName?: string;
    buildIdentifier?: string;
    testObservability: TestOpsConfig;
    percy: boolean;
    percyCaptureMode?: string;
    accessibility?: boolean;
    app?: string | AppConfig;
    private static _instance;
    appAutomate: boolean;
    automate: boolean;
    funnelDataSent: boolean;
    percyBuildId?: number | null;
    isPercyAutoEnabled: boolean;
    sdkRunID: string;
    killSignal?: string;
    logsUploaded: boolean;
    constructor(options: BrowserstackConfig & Options.Testrunner, config: Options.Testrunner, capabilities?: Capabilities.TestrunnerCapabilities);
    sentFunnelData(): void;
    setKillSignal(signal: string): void;
}
export default BrowserStackConfig;
