/**
 * WebdriverIO BrowserStack App Automate Configuration
 * CNN Mobile App — runs on BrowserStack real devices
 *
 * Usage: npx wdio run ./wdio.browserstack.conf.js
 *
 * Prerequisites:
 *   - Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY in .env
 *   - Upload the CNN APK to BrowserStack App Automate and set BROWSERSTACK_APP_ID,
 *     OR leave app_url unset to use the local APK path (auto-uploaded by the service)
 */

import path from 'path'
import { createAnalyticsHooks } from './test/support/analytics.capture.js'

const analyticsHooks = createAnalyticsHooks()

export const config = {
    // ==================
    // Runner
    // ==================
    runner: 'local',

    // ==================
    // Test Files
    // ==================
    specs: [
        './test/specs/**/*.js'
    ],
    exclude: [],

    // ==================
    // BrowserStack Hub
    // ==================
    user: process.env.BROWSERSTACK_USERNAME,
    key: process.env.BROWSERSTACK_ACCESS_KEY,
    hostname: 'hub.browserstack.com',
    port: 443,
    protocol: 'https',
    path: '/wd/hub',

    maxInstances: 2,

    // ==================
    // Capabilities — App Automate (Android)
    // ==================
    capabilities: [
        {
            platformName: 'Android',
            'appium:deviceName': 'Samsung Galaxy S24 ultra',
            'appium:platformVersion': '14.0',
            'appium:automationName': 'UiAutomator2',
            'appium:app': process.env.BROWSERSTACK_APP_ID ||
                path.join(process.cwd(), 'apps/cnn-standard-production-release.apk'),
            'appium:appActivity': 'com.cnn.mobile.android.phone.features.splash.SplashActivity',
            'appium:autoGrantPermissions': true,
            'appium:newCommandTimeout': 300,
            'bstack:options': {
                projectName: 'wdio-appium',
                buildName: 'CNN Mobile App Tests',
                sessionName: 'Android S24 ultra - CNN App',
                debug: true,
                networkLogs: true,
                deviceLogs: true,
                appiumVersion: '2.0.0'
            }
        },
        {
            platformName: 'Android',
            'appium:deviceName': 'Google Pixel 7',
            'appium:platformVersion': '13.0',
            'appium:automationName': 'UiAutomator2',
            'appium:app': process.env.BROWSERSTACK_APP_ID ||
                path.join(process.cwd(), 'apps/cnn-standard-production-release.apk'),
            'appium:appActivity': 'com.cnn.mobile.android.phone.features.splash.SplashActivity',
            'appium:autoGrantPermissions': true,
            'appium:newCommandTimeout': 300,
            'bstack:options': {
                projectName: 'wdio-appium',
                buildName: 'CNN Mobile App Tests',
                sessionName: 'Android Pixel 7 - CNN App',
                debug: true,
                networkLogs: true,
                deviceLogs: true,
                appiumVersion: '2.0.0'
            }
        }
    ],

    // ==================
    // Test Configurations
    // ==================
    logLevel: 'info',
    bail: 0,
    waitforTimeout: 30000,
    connectionRetryTimeout: 120000,
    connectionRetryCount: 3,

    // BrowserStack service — handles session management and test observability
    services: [
        [
            'browserstack',
            {
                testObservability: true,
                testObservabilityOptions: {
                    projectName: 'wdio-appium',
                    buildName: 'CNN Mobile App Tests'
                },
                app: process.env.BROWSERSTACK_APP_ID ||
                    path.join(process.cwd(), 'apps/cnn-standard-production-release.apk'),
                browserstackLocal: false
            }
        ]
    ],

    framework: 'mocha',
    reporters: ['spec'],

    mochaOpts: {
        ui: 'bdd',
        timeout: 180000
    },

    // ==================
    // Hooks (analytics capture)
    // ==================
    before: analyticsHooks.before,
    afterCommand: analyticsHooks.afterCommand,
    after: analyticsHooks.after
}
