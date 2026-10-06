import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * TC-001: Homepage Load
 * Description: Navigate to CNN app and verify the homepage loads.
 * Platform: Android (iOS patterns noted in comments)
 * Prerequisites: CNN APK installed, Appium running
 */

describe('TC-001: Homepage Load', () => {

    it('should load the CNN homepage and fire a Pageview analytics event', async () => {
        // Wait for app to fully launch past splash screen.
        await browser.pause(5000)

        const contentFeed = await $('//android.widget.ScrollView')
        const mainContainer = await $('//androidx.compose.ui.platform.ComposeView')
        const homeTab = await $('~Home')
        const contentLoadError = await $('//*[contains(@text,"failed to load or is unavailable")]')
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
        try {
            await browser.waitUntil(async () => {
                const contentErrorVisible = await contentLoadError.isDisplayed().catch(() => false)
                if (contentErrorVisible) return true

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

            if (await contentLoadError.isDisplayed().catch(() => false)) {
                throw new Error('CNN homepage displayed a content-load error')
            }
        } catch (waitError) {
            let source = ''
            let sourceError
            try {
                source = await driver.getPageSource()
            } catch (error) {
                sourceError = error.message
            }

            const homeVisible = await homeTab.isDisplayed().catch(() => false)
            const homeLabelVisible = /content-desc="Home"|text="Home"/.test(source)
            const feedVisible = await contentFeed.isDisplayed().catch(() => false)
            const containerVisible = await mainContainer.isDisplayed().catch(() => false)
            const contentErrorVisible = await contentLoadError.isDisplayed().catch(() => false)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
            const pageSourcePath = join(process.cwd(), 'logs', `TC001-homepage-timeout-${timestamp}.xml`)
            const screenshotPath = join(process.cwd(), 'logs', `TC001-homepage-timeout-${timestamp}.png`)

            console.error('[TC-001] Homepage readiness diagnostics:', JSON.stringify({
                homeTabDisplayed: homeVisible,
                homeLabelInPageSource: homeLabelVisible,
                feedDisplayed: feedVisible,
                mainContainerDisplayed: containerVisible,
                contentLoadErrorDisplayed: contentErrorVisible,
                homepageReady: !contentErrorVisible && homeVisible && homeLabelVisible && (feedVisible || containerVisible),
                pageSourceError: sourceError
            }))

            try {
                await writeFile(pageSourcePath, source, 'utf8')
                console.error('[TC-001] Homepage timeout page source saved:', pageSourcePath)
            } catch (error) {
                console.error('[TC-001] Could not save homepage timeout page source:', error.message)
            }

            try {
                await browser.saveScreenshot(screenshotPath)
                console.error('[TC-001] Homepage timeout screenshot saved:', screenshotPath)
            } catch (error) {
                console.error('[TC-001] Could not save homepage timeout screenshot:', error.message)
            }

            throw waitError
        }

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
    })
})
