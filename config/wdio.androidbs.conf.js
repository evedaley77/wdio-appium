import { config as baseConfig } from './wdio.conf.js'
import { createAnalyticsHooks } from '../test/support/analytics.capture.js'
import { createNetworkLogHooks } from '../test/support/network.logs.js'
import { createPageCaptureHooks } from '../test/support/page.capture.js'
import { createBaselineReport } from '../test/support/baseline.report.js'

const analyticsHooks = createAnalyticsHooks()
const networkLogHooks = createNetworkLogHooks()
const pageCaptureHooks = createPageCaptureHooks()
const baselineReport = createBaselineReport({ configFile: 'config/wdio.androidbs.conf.js' })

export const config = {
...baseConfig,
runner: 'local',
hostname: 'hub.browserstack.com',
port: 443,
protocol: 'https',
path: '/wd/hub',
connectionRetryTimeout: 180000,
connectionRetryCount: 5,
waitforTimeout: 30000,
maxInstances: 1,
mochaOpts: {
    ui: 'bdd',
    timeout: 180000
},
services: [
    [
        'browserstack',
        {
            testObservability: true,
            testObservabilityOptions: {
                projectName: 'CNN Android App',
                buildName: 'CNN Android HomepageLoad',
            },
            browserstackLocal: false
        }
    ]
],
user: process.env.BROWSERSTACK_USERNAME,
key: process.env.BROWSERSTACK_ACCESS_KEY,
specs: [
    '../test/specs/android/TC001_HomepageLoad.spec.js'
    
],
capabilities: [
    {
        platformName: 'Android',
        'appium:platformVersion': '16.0',
        'appium:deviceName': 'Samsung Galaxy S26 Ultra',
        'appium:app': process.env.BROWSERSTACK_APP_ID ||
            'bs://4209159c07672b2063bdec2a5d5bb32c8a94e837',
        'appium:automationName': 'UiAutomator2',
        'appium:appActivity': 'com.cnn.mobile.android.phone.features.splash.SplashActivity',
        'appium:appWaitActivity': 'com.cnn.mobile.android.phone.features.splash.SplashActivity',
        'appium:newCommandTimeout': 300,
        'appium:autoGrantPermissions': true,
        'appium:orientation': 'PORTRAIT',
        'bstack:options': {
            projectName: 'CNN Android App',
            buildName: 'CNN Android HomepageLoad',
            sessionName: 'TC-001 Homepage Load',
            debug: true,
            networkLogs: true,
            networkLogsOptions: { captureContent: true },
            deviceLogs: true
        }
    }
],
before: async function (capabilities, specs) {
    networkLogHooks.rememberSession(capabilities, specs)
    pageCaptureHooks.before(capabilities, specs)
    await analyticsHooks.before(capabilities, specs)
},
afterCommand: analyticsHooks.afterCommand,
afterTest: pageCaptureHooks.afterTest,
after: analyticsHooks.after,
afterSession: networkLogHooks.afterSession,
onWorkerEnd: baselineReport.onWorkerEnd,
onComplete: baselineReport.onComplete










}