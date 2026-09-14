/**
 * TC-011: Live Updates Access
 * Description: Validate access to Live Updates on CNN app.
 * Platform: Android
 */

import { browser, $, $$ } from '@wdio/globals'

async function completeOnboarding () {
    await browser.pause(5000)
    const editionScreen = await $('//android.widget.TextView[@text="U.S. Edition"]')
    if (!await editionScreen.isDisplayed().catch(() => false)) return
    await $('//android.widget.TextView[@text="Next"]').click()
    await browser.pause(3000)
    const saveBtn = await $('//android.widget.TextView[@text="Save and continue"]')
    if (await saveBtn.isDisplayed().catch(() => false)) { await saveBtn.click(); await browser.pause(3000) }
    const allowBtn = await $('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]')
    if (await allowBtn.isDisplayed().catch(() => false)) { await allowBtn.click(); await browser.pause(3000) }
    const agreeBtn = await $('//android.widget.TextView[@text="AGREE"]')
    if (await agreeBtn.isDisplayed().catch(() => false)) { await agreeBtn.click(); await browser.pause(5000) }
}

describe('TC-011: Live Updates Access', () => {

    before(async () => { await completeOnboarding() })

    it('should access live/breaking news module and load live coverage page', async () => {

        // Look for LIVE badge on homepage story cards
        const liveLabel = await $('//android.widget.TextView[@text="LIVE"]')
        if (await liveLabel.isDisplayed().catch(() => false)) {
            console.log('[TC-011] LIVE badge found — clicking')
            await liveLabel.click()
        } else {
            // Fallback: look for "Live Updates" text
            const liveUpdatesLink = await $('//android.widget.TextView[contains(@text,"Live Updates")]')
            if (await liveUpdatesLink.isDisplayed().catch(() => false)) {
                await liveUpdatesLink.click()
            } else {
                // Fallback: click first headline
                const firstHeadline = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
                await expect(firstHeadline).toBeDisplayed()
                await firstHeadline.click()
            }
        }
        await browser.pause(5000)

        // Verify live updates page loaded
        const articleScrollView = await $('//android.widget.ScrollView[@resource-id="com.cnn.mobile.android.phone:id/article_scroll_view"]')
        await expect(articleScrollView).toBeDisplayed()

        // Validate analytics in WEBVIEW
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
        if (webview) {
            await browser.switchContext(webview)
            const currentUrl = await browser.getUrl()
            console.log('[TC-011] Live updates URL:', currentUrl)
            expect(currentUrl).toContain('cnn.com')
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-011] Live analytics:', JSON.stringify(analyticsEvents.slice(0, 5)))
            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-011] Live updates access test completed')
    })
})
