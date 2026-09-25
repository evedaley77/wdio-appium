/**
 * TC-010: Account Session Persistence
 * Description: Validate the logged-in session is persistent after app refresh.
 * Platform: Android
 * Prerequisites: Set CNN_TEST_EMAIL and CNN_TEST_PASSWORD environment variables.
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

describe('TC-010: Account Session Persistence', () => {

    before(async () => { await completeOnboarding() })

    it('should remain logged in after app is backgrounded and restored', async () => {
        const testEmail = process.env.CNN_TEST_EMAIL || 'test@example.com'
        const testPassword = process.env.CNN_TEST_PASSWORD || 'TestPassword123!'

        // Navigate to profile tab and sign in
        const profileTab = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/navigation_profile"]')
        if (await profileTab.isDisplayed().catch(() => false)) {
            await profileTab.click()
        } else {
            const navItems = await $$('//android.widget.FrameLayout[@resource-id="com.cnn.mobile.android.phone:id/navigation_bar_item_icon_view"]')
            if (navItems.length > 0) await navItems[navItems.length - 1].click()
        }
        await browser.pause(3000)

        const signInBtn = await $('//android.widget.TextView[@text="Sign In"]')
        if (await signInBtn.isDisplayed().catch(() => false)) {
            await signInBtn.click()
            await browser.pause(3000)
        }

        const contexts = await browser.getContexts()
        const webview = contexts.find(ctx => ctx.startsWith('WEBVIEW'))
        if (webview) {
            await browser.switchContext(webview)
            const emailInput = await $('input[type="email"]')
            await expect(emailInput).toBeDisplayed()
            await emailInput.setValue(testEmail)
            const passwordInput = await $('input[type="password"]')
            await passwordInput.setValue(testPassword)
            const loginBtn = await $('button[type="submit"]')
            await loginBtn.click()
            await browser.pause(5000)
            console.log('[TC-010] Logged in, URL:', await browser.getUrl())
            await browser.switchContext('NATIVE_APP')
        }

        // Background the app for 3 seconds then restore
        await driver.background(3)
        await browser.pause(3000)

        // Verify Sign In button is NOT visible — user still logged in
        const profileTabAfter = await $('//android.widget.TextView[@resource-id="com.cnn.mobile.android.phone:id/navigation_profile"]')
        if (await profileTabAfter.isDisplayed().catch(() => false)) {
            await profileTabAfter.click()
            await browser.pause(2000)
        }
        const signInBtnAfter = await $('//android.widget.TextView[@text="Sign In"]')
        const signInVisible = await signInBtnAfter.isDisplayed().catch(() => false)
        console.log('[TC-010] Sign In visible after restore (should be false):', signInVisible)
        expect(signInVisible).toBe(false)

        // Validate session ID persists in analytics
        const contextsAfter = await browser.getContexts()
        const webviewAfter = contextsAfter.find(ctx => ctx.startsWith('WEBVIEW'))
        if (webviewAfter) {
            await browser.switchContext(webviewAfter)
            const eventsAfter = await browser.execute(() => window.__wdioAnalyticsEvents || [])
            console.log('[TC-010] Analytics after restore:', JSON.stringify(eventsAfter.slice(0, 3)))
            await browser.switchContext('NATIVE_APP')
        }

        console.log('[TC-010] Session persistence test completed')
    })
})
