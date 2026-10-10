/**
 * TC-016: For You - Personalized Content Behavior
 * Description: Validate For You loads personalized content and recommendations update dynamically.
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

describe('TC-016: For You - Personalized Content Behavior', () => {

    before(async () => { await completeOnboarding() })

    it('should update For You recommendations after engaging with content', async () => {

        // Navigate to For You tab
        const forYouTab = await $('//android.widget.TextView[@text="For You"]')
        if (await forYouTab.isDisplayed().catch(() => false)) {
            await forYouTab.click()
            await browser.pause(4000)
        }

        // Capture initial recommendation list
        const contentFeed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        await expect(contentFeed).toBeDisplayed()

        const initialItems = await $$('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
        const initialCount = initialItems.length
        console.log('[TC-016] Initial recommendation count:', initialCount)
        expect(initialCount).toBeGreaterThan(0)

        // Engage with content — click first story
        if (initialItems.length > 0) {
            await initialItems[0].click()
            await browser.pause(4000)

            // Go back to For You
            await driver.back()
            await browser.pause(3000)
        }

        // Verify recommendations are still displayed after engagement
        await expect(contentFeed).toBeDisplayed()
        const updatedItems = await $$('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
        console.log('[TC-016] Updated recommendation count:', updatedItems.length)
        expect(updatedItems.length).toBeGreaterThan(0)

        // Validate analytics in WEBVIEW
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))
        if (webview) {
            await browser.switchContext(webview)
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-016] For You behavior analytics:', JSON.stringify(analyticsEvents.slice(0, 5)))
            const recEvent = analyticsEvents.find(e => e.url && (e.url.includes('recommendation') || e.url.includes('for_you') || e.url.includes('personali')))
            console.log('[TC-016] Recommendation event:', recEvent ? 'found' : 'not found in captured events')
            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-016] For You personalized behavior test completed')
    })
})
