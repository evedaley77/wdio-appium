/**
 * TC-013: Watch Tab Navigation
 * Description: Validate Watch tab exists and loads the video hub.
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

describe('TC-013: Watch Tab Navigation', () => {

    before(async () => { await completeOnboarding() })

    it('should navigate to Watch tab and load the video hub', async () => {

        // Click the Watch tab in bottom navigation
        const watchTab = await $('~Watch')
        await expect(watchTab).toBeDisplayed()
        await watchTab.click()
        await browser.pause(4000)

        // Verify video hub is loaded
        const videoHub = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        await expect(videoHub).toBeDisplayed()

        // Validate analytics in WEBVIEW
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))
        if (webview) {
            await browser.switchContext(webview)
            const currentUrl = await browser.getUrl()
            console.log('[TC-013] Watch URL:', currentUrl)
            expect(currentUrl).toContain('cnn.com')
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-013] Watch analytics:', JSON.stringify(analyticsEvents.slice(0, 5)))
            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-013] Watch tab navigation test completed')
    })
})
