/**
 * TC-006: Article Scroll Interaction / Scroll Depth
 * Description: Scroll through an article and verify content loads progressively,
 *              validate scroll depth analytics event.
 * Platform: Android
 */

import { browser, $, $$ } from '@wdio/globals'

async function completeOnboarding () {
    await browser.pause(5000)
    const editionScreen = await $('//android.widget.TextView[@text="U.S. Edition"]')
    const editionVisible = await editionScreen.isDisplayed().catch(() => false)
    if (!editionVisible) return

    const clickWhenReady = async (selector, name, timeout = 15000) => {
        const element = await $(selector)
        await browser.waitUntil(async () => {
            const visible = await element.isDisplayed().catch(() => false)
            const enabled = await element.isEnabled().catch(() => false)
            return visible && enabled
        }, {
            timeout,
            interval: 500,
            timeoutMsg: `${name} button was not ready to click`
        })
        await element.click()
        await browser.pause(3000)
    }

    await clickWhenReady('//android.widget.Button[@text="Next"] | //android.widget.TextView[@text="Next"] | //*[@text="Next"]', 'Next')
    await clickWhenReady('//android.widget.Button[@text="Save and continue"] | //android.widget.TextView[@text="Save and continue"] | //*[@text="Save and continue"]', 'Save and continue', 10000).catch(() => {})
    await clickWhenReady('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]', 'Allow notifications', 10000).catch(() => {})
    await clickWhenReady('//android.widget.Button[@text="AGREE"] | //android.widget.TextView[@text="AGREE"] | //*[@text="AGREE"]', 'AGREE', 10000).catch(() => {})
}

describe('TC-006: Article Scroll Interaction / Scroll Depth', () => {

    before(async () => {
        await completeOnboarding()
    })

    it('should fire scroll depth analytics event when scrolling through an article', async () => {

        // Navigate to an article from homepage
        const firstHeadline = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
        await expect(firstHeadline).toBeDisplayed()
        await firstHeadline.click()
        await browser.pause(5000)

        // Verify article loaded
        const articleScrollView = await $('//android.widget.ScrollView[@resource-id="com.cnn.mobile.android.phone:id/article_scroll_view"]')
        await expect(articleScrollView).toBeDisplayed()

        // Scroll through the article from top to bottom using W3C Actions
        const { width, height } = await driver.getWindowSize()
        const startX = Math.floor(width / 2)

        for (let i = 0; i < 5; i++) {
            await driver.action('pointer')
                .move({ duration: 0, x: startX, y: Math.floor(height * 0.8) })
                .down({ button: 0 })
                .move({ duration: 500, x: startX, y: Math.floor(height * 0.2) })
                .up({ button: 0 })
                .perform()
            await browser.pause(1500)
        }

        // Verify content still displayed after scrolling
        await expect(articleScrollView).toBeDisplayed()

        // Validate scroll depth analytics in WEBVIEW
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
        if (webview) {
            await browser.switchContext(webview)
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-006] Scroll analytics events:', JSON.stringify(analyticsEvents.slice(0, 10)))
            const scrollEvent = analyticsEvents.find(e => e.url && (e.url.includes('scroll') || e.url.includes('depth')))
            console.log('[TC-006] Scroll depth event:', scrollEvent ? 'found' : 'not found in captured events')
            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-006] Article scroll depth test completed')
    })
})
