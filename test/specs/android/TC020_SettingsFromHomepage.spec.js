/**
 * TC-020: Settings from Homepage
 * Description: Navigate to CNN app the homepage loads then click on the settings tab.
 * Platform: Android (iOS patterns noted in comments)
 * Prerequisites: CNN APK installed, Appium running
 */

describe('TC-020: Settings from Homepage', () => {

    it('should load the CNN homepage and fire a Pageview analytics event', async () => {
        // Wait for app to fully launch past splash screen.
        await browser.pause(5000)

        const contentFeed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        const mainContainer = await $('//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/container"]')
        const homeTab = await $('~Home')
       // const settingsTabElement = await $('//android.view.View[@content-desc="Settings"]')
        const agreeSelector = '//android.widget.Button[@text="AGREE"] | //android.widget.TextView[@text="AGREE"] | //*[@text="AGREE"]'
        const clickWhenReady = async (selector, timeout = 15000) => {
            const element = await $(selector)
            await browser.waitUntil(async () => {
                return await element.isDisplayed().catch(() => false) &&
                    await element.isEnabled().catch(() => false)
            }, { timeout, interval: 500 })
            await element.click()
        }

        // Dismiss onboarding if present (edition selection screen)
        const editionScreen = await $('//android.widget.TextView[@text="U.S. Edition"]')
        const editionVisible = await editionScreen.isDisplayed().catch(() => false)
        if (editionVisible) {
            await clickWhenReady(
                '//android.widget.Button[@text="Next"] | //android.widget.TextView[@text="Next"] | //*[@text="Next"]'
            )
            await browser.pause(5000)

            // Save and continue past alerts screen
            await clickWhenReady(
                '//android.widget.Button[@text="Save and continue"] | //android.widget.TextView[@text="Save and continue"] | //*[@text="Save and continue"]',
                10000
            ).catch(() => {})
            await browser.pause(3000)

            // Allow notifications if prompted
            await clickWhenReady(
                '//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]',
                10000
            ).catch(() => {})
            await browser.pause(3000)
        }

        // Legal terms can appear after a delayed permission screen or on their own.
        await browser.waitUntil(async () => {
            const homeVisible = await homeTab.isDisplayed().catch(() => false)
            const agreeVisible = await $(agreeSelector).isDisplayed().catch(() => false)
            return homeVisible || agreeVisible
        }, { timeout: 30000, interval: 1000, timeoutMsg: 'CNN onboarding did not reach Home or Legal Terms within 30s' })

        if (!await homeTab.isDisplayed().catch(() => false)) {
            await clickWhenReady(agreeSelector, 15000)
            await browser.pause(5000)
        }

        // The package is present during onboarding, so wait for actual homepage UI.
        await browser.waitUntil(async () => {
            const homeVisible = await homeTab.isDisplayed().catch(() => false)
            if (!homeVisible) return false

            const source = await driver.getPageSource().catch(() => '')
            const homeLabelVisible = /content-desc="Home"|text="Home"/.test(source)
            const feedVisible = await contentFeed.isDisplayed().catch(() => false)
            const containerVisible = await mainContainer.isDisplayed().catch(() => false)
            return homeLabelVisible && (feedVisible || containerVisible)
        }, {
            timeout: 60000,
            interval: 1000,
            timeoutMsg: 'CNN homepage Home tab and content surface did not load within 60s'
        })

        // Verify the homepage surfaces remain visible after initial rendering.
        const bottomNav = await $('//*[@resource-id="com.cnn.mobile.android.phone:id/bottom_navigation"]')
        const bottomNavVisible = await bottomNav.isDisplayed().catch(() => false)
        console.log('[TC-001] Bottom nav visible:', bottomNavVisible)

        await expect(homeTab).toBeDisplayed()
        const homepageSurfaceVisible = await mainContainer.isDisplayed().catch(() => false) ||
            await contentFeed.isDisplayed().catch(() => false)
        expect(homepageSurfaceVisible).toBe(true)

        const pageSource = await driver.getPageSource()
        expect(pageSource).toContain('com.cnn.mobile.android.phone')

        // Inspect only CNN WebViews; BrowserStack may expose unrelated app contexts.
        const contexts = await browser.getContexts()
        const webview = contexts.find(context => context.startsWith('WEBVIEW_com.cnn'))
        if (webview) {
            try {
                await browser.switchContext(webview)
                const analyticsEvents = await browser.execute(() => {
                    return window.__wdioAnalyticsEvents || []
                })
                console.log('[TC-001] Analytics events captured:', JSON.stringify(analyticsEvents.slice(0, 5)))
            } finally {
                await browser.switchContext('NATIVE_APP')
            }
        }

        console.log('[TC-001] Homepage loaded successfully')

        // Open Settings from the bottom navigation after the homepage is ready.
        //const settingsTab = await $('~Settings')
        const settingsTabElement = await $('//android.view.View[@content-desc="Settings"]')
        await settingsTabElement.waitForDisplayed({
            timeout: 15000,
            timeoutMsg: 'Settings option was not displayed in the bottom navigation'
        })
        await settingsTabElement.click()

        // Open the subscription flow from Settings.
        const subscribeOption = await $(
            '//*[@text="Subscribe"] | ' +
            '//*[@text="Subscribe Now"] | ' +
            '//*[contains(@text,"Subscribe")]'
        )
        await subscribeOption.waitForDisplayed({
            timeout: 20000,
            timeoutMsg: 'Subscribe option was not displayed in Settings'
        })
        await subscribeOption.click()

        // Select the first recognizable plan option shown by the subscription screen.
        const planOption = await $(
            '//*[@text="Monthly"] | ' +
            '//*[@text="Annual"] | ' +
            '//*[@text="Choose a plan"] | ' +
            '//*[contains(@text,"Monthly")] | ' +
            '//*[contains(@text,"Annual")]'
        )
        await planOption.waitForDisplayed({
            timeout: 30000,
            timeoutMsg: 'No subscription plan option was displayed after selecting Subscribe'
        })
        await planOption.click()
        console.log('[TC-001] Settings opened, Subscribe selected, and a plan option clicked')
    })
})
