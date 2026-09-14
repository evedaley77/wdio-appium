import { config as baseConfig } from './wdio.conf.js'
import { createAnalyticsHooks } from '../test/support/analytics.capture.js'

const analyticsHooks = createAnalyticsHooks()

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
before: analyticsHooks.before,
afterCommand: analyticsHooks.afterCommand,
after: analyticsHooks.after,
services: [
    [
        'browserstack',
        {
            testObservability: true,
            testObservabilityOptions: {
                projectName: 'CNN Android App',
                buildName: 'CNN Android Homepage Load'
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
            'bs://d92ac37648f7e3399984bd7c5c095636eb821fde', // BrowserStack app URL
        'appium:automationName': 'UiAutomator2',
        'appium:chromedriverAutodownload': true,
        'appium:ensureWebviewsHavePages': true,
        'appium:webviewConnectTimeout': 30000,
        'appium:appActivity': 'com.cnn.mobile.android.phone.features.splash.SplashActivity',
        'appium:appWaitActivity': 'com.cnn.mobile.android.phone.features.splash.SplashActivity',
        'appium:newCommandTimeout': 300,
        'appium:autoGrantPermissions': true,
        'appium:orientation': 'PORTRAIT',
        'bstack:options': {
            projectName: 'CNN Android App',
            buildName: 'CNN Android Homepage Load',
            sessionName: 'TC-001 Homepage Load',
            debug: true,
            networkLogs: true,
            deviceLogs: true
        }
    }
]










}