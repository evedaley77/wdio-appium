/**
 * BrowserStack config for TC-019: Analytics Journey
 * Extends the shared base config from wdio.conf.js
 */
import { config as baseConfig } from './wdio.conf.js'

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

    services: [
        [
            'browserstack',
            {
                testObservability: true,
                testObservabilityOptions: {
                    projectName: 'CNN Android App',
                    buildName: 'CNN Android Analytics Journey'
                },
                browserstackLocal: false
            }
        ]
    ],

    user: process.env.BROWSERSTACK_USERNAME,
    key: process.env.BROWSERSTACK_ACCESS_KEY,

    specs: [
        '../test/specs/android/TC019_AnalyticsJourney.spec.js'
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
                buildName: 'CNN Android Analytics Journey',
                sessionName: 'TC-019 Analytics Journey',
                debug: true,
                networkLogs: true,
                deviceLogs: true
            }
        }
    ],

    mochaOpts: {
        ui: 'bdd',
        timeout: 180000
    }
}
