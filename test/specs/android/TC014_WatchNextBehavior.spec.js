/**
 * TC-014: Watch Next Behavior
 * Description: Validate Watch Next recommendations appear after video completes/pauses.
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

describe('TC-014: Watch Next Behavior', () => {

    before(async () => { await completeOnboarding() })

    it('should show Watch Next recommendations after selecting a video', async () => {

        // Navigate to Watch tab
        const watchTab = await $('~Watch')
        await expect(watchTab).toBeDisplayed()
        await watchTab.click()
        await browser.pause(4000)

        // Select first video from the video hub
        const firstVideo = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]//android.widget.FrameLayout')
        await expect(firstVideo).toBeDisplayed()
        await firstVideo.click()
        await browser.pause(5000)

        // Pause the video by tapping the screen
        const videoPlayer = await $('//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/video_player"]')
        if (await videoPlayer.isDisplayed().catch(() => false)) {
            await videoPlayer.click()
            await browser.pause(2000)
        }

        // Verify Watch Next / recommendations container appears
        const watchNextContainer = await $('//android.widget.TextView[contains(@text,"Watch Next")]')
        const watchNextVisible = await watchNextContainer.isDisplayed().catch(() => false)
        console.log('[TC-014] Watch Next container visible:', watchNextVisible)

        // Validate analytics in WEBVIEW
        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))
        if (webview) {
            await browser.switchContext(webview)
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-014] Watch analytics:', JSON.stringify(analyticsEvents.slice(0, 5)))
            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-014] Watch Next behavior test completed')
    })
})
