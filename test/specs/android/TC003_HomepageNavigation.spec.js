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
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW_com.cnn'))

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