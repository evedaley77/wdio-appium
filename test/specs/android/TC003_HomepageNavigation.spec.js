/**
 * TC-003: Homepage Navigation
 * Description: Click a top story and verify navigation to an article page and back.
 * Platform: Android
 */

describe('TC-003: Homepage Navigation', () => {

    before(async () => {
        await browser.pause(5000)

        const editionScreen = await $('//android.widget.TextView[@text="U.S. Edition"]')
        const editionVisible = await editionScreen.isDisplayed().catch(() => false)

        if (editionVisible) {
            await $('//android.widget.TextView[@text="Next"]').click()
            await browser.pause(3000)

            const saveBtn = await $('//android.widget.TextView[@text="Save and continue"]')
            if (await saveBtn.isDisplayed().catch(() => false)) {
                await saveBtn.click()
                await browser.pause(3000)
            }

            const allowBtn = await $('//android.widget.Button[@resource-id="com.android.permissioncontroller:id/permission_allow_button"]')
            if (await allowBtn.isDisplayed().catch(() => false)) {
                await allowBtn.click()
                await browser.pause(3000)
            }
        }

        // Accept the Legal Terms and Privacy page when displayed.
        await browser.waitUntil(async () => {
            const agreeBtn = await $(
                '//android.widget.TextView[@text="AGREE"] | ' +
                '//android.widget.Button[@text="AGREE"] | ' +
                '//*[@text="AGREE"]'
            )

            if (await agreeBtn.isDisplayed().catch(() => false)) {
                await agreeBtn.click()
                return true
            }

            return false
        }, {
            timeout: 30000,
            interval: 1000,
            timeoutMsg: 'The Legal Terms and Privacy AGREE button was not displayed'
        })

        // Confirm that the homepage has loaded.
        const contentFeed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        await contentFeed.waitForDisplayed({
            timeout: 30000,
            timeoutMsg: 'Homepage did not load after selecting AGREE'
        })
    })

    it('should navigate from homepage to article and back', async () => {
        const contentFeed = await $('//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]')
        await expect(contentFeed).toBeDisplayed()

        const firstHeadline = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/headline"]')
        await expect(firstHeadline).toBeDisplayed()
        await firstHeadline.click()
        await browser.pause(4000)

        const articleContainer = await $('//android.widget.ScrollView[@resource-id="com.cnn.mobile.android.phone:id/article_scroll_view"]')
        await expect(articleContainer).toBeDisplayed()

        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))

        if (webview) {
            await browser.switchContext(webview)
            const analyticsEvents = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-003] Article pageview analytics:', JSON.stringify(analyticsEvents.slice(0, 5)))
            await browser.switchContext('NATIVE_APP')
        }

        await browser.back()
        await browser.pause(3000)
        await expect(contentFeed).toBeDisplayed()

        console.log('[TC-003] Homepage navigation to article and back verified')
    })
})