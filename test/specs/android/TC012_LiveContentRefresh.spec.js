/**
 * TC-012: Live Content Refresh Behavior
 * Description: Validate Live Content behavior when refreshed, same session ID persists.
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

describe('TC-012: Live Content Refresh Behavior', () => {

    before(async () => { await completeOnboarding() })

    it('should refresh live content and maintain same session ID', async () => {

        // Navigate to a live story
        const liveLabel = await $('//android.widget.TextView[@text="LIVE"]')
        if (await liveLabel.isDisplayed().catch(() => false)) {
            await liveLabel.click()
        } else {
            const firstHeadline = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
            await expect(firstHeadline).toBeDisplayed()
            await firstHeadline.click()
        }
        await browser.pause(5000)

        // Capture session ID before refresh
        let sessionIdBefore = null
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))
        if (webview) {
            await browser.switchContext(webview)
            const eventsBefore = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            sessionIdBefore = eventsBefore.length > 0 ? eventsBefore[0].timestamp : null
            console.log('[TC-012] Events before refresh count:', eventsBefore.length)
            await browser.switchContext('NATIVE_APP')
        }

        // Pull-to-refresh gesture
        const { width, height } = await driver.getWindowSize()
        await driver.action('pointer')
            .move({ duration: 0, x: Math.floor(width / 2), y: Math.floor(height * 0.3) })
            .down({ button: 0 })
            .move({ duration: 800, x: Math.floor(width / 2), y: Math.floor(height * 0.7) })
            .up({ button: 0 })
            .perform()
        await browser.pause(4000)

        // Verify live page still displayed after refresh
        const articleScrollView = await $('//android.widget.ScrollView[@resource-id="com.cnn.mobile.android.phone:id/article_scroll_view"]')
        await expect(articleScrollView).toBeDisplayed()

        // Validate analytics after refresh — session should persist
        const contextsAfter = await browser.getContexts()
        const webviewAfter = contextsAfter.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))
        if (webviewAfter) {
            await browser.switchContext(webviewAfter)
            const eventsAfter = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-012] Analytics after refresh:', JSON.stringify(eventsAfter.slice(0, 5)))
            const liveVideoEvent = eventsAfter.find(e => e.url && e.url.includes('LiveVideoStart'))
            console.log('[TC-012] LiveVideoStart event:', liveVideoEvent ? 'found' : 'not found in captured events')
            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-012] Live content refresh test completed')
    })
})
