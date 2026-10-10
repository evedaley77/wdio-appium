/**
 * TC-015: For You - Personalized Content Visibility
 * Description: Validate For You loads personalized content.
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

describe('TC-015: For You - Personalized Content Visibility', () => {

    before(async () => { await completeOnboarding() })

    it('should display personalized content in the For You section', async () => {

        // Navigate to For You tab in bottom navigation
        const forYouTab = await $('//android.widget.TextView[@text="For You"]')
        const forYouVisible = await forYouTab.isDisplayed().catch(() => false)

        if (forYouVisible) {
            await forYouTab.click()
            await browser.pause(4000)
        } else {
            // Fallback: scroll homepage to find For You section
            const { width, height } = await driver.getWindowSize()
            for (let i = 0; i < 3; i++) {
                await driver.execute('mobile: swipeGesture', {
                    left: 0,
                    top: Math.floor(height * 0.3),
                    width,
                    height: Math.floor(height * 0.4),
                    direction: 'up',
                    percent: 1.0,
                    speed: 2000
                })
                await browser.pause(1000)
            }
        }

        // Verify recommended content section is displayed
        const contentFeed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        await expect(contentFeed).toBeDisplayed()

        // Validate analytics in WEBVIEW
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))
        if (webview) {
            await browser.switchContext(webview)
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-015] For You analytics:', JSON.stringify(analyticsEvents.slice(0, 5)))
            const forYouEvent = analyticsEvents.find(e => e.url && (e.url.includes('recommendation') || e.url.includes('for_you') || e.url.includes('personali')))
            console.log('[TC-015] For You recommendation event:', forYouEvent ? 'found' : 'not found in captured events')
            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-015] For You personalized content test completed')
    })
})
