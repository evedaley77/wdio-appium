/**
 * CNN US Android App - Homepage View User Journey
 * Converted from tests_cnn-us-android-app-prod-homepage-regression.json
 * Platform: Android
 */

import { collectAnalyticsEvents, installAnalyticsCapture } from '../../support/analytics.capture.js'

const selectors = {
    next: "//android.widget.ScrollView//android.widget.TextView[@text='Next' or @text='NEXT']",
    skipAlerts: "//androidx.compose.ui.platform.ComposeView//android.widget.TextView[@text='Skip (No Alerts)']",
    agree: "//*[@clickable='true' and (contains(@text,'Agree') or contains(@text,'AGREE'))]",
    breakingNewsDismiss: 'new UiSelector().resourceId("com.cnn.mobile.android.phone:id/image_view_breaking_news_banner_dismiss").className("android.widget.ImageView")',
    tooltipClose: "//android.view.ViewGroup//android.widget.ImageView[@content-desc='Close' and @clickable='true']",
    homeFeed: '//androidx.recyclerview.widget.RecyclerView[@resource-id="com.cnn.mobile.android.phone:id/recycler_view"]',
    magicWall: "//*[contains(@text,'Magic Wall') or contains(@content-desc,'Magic Wall')]",
    username: '//android.widget.EditText[1]',
    password: '//android.widget.EditText[2]'
}

async function tapAt (x, y) {
    await driver.action('pointer', { parameters: { pointerType: 'touch' } })
        .move({ duration: 0, x, y })
        .down({ button: 0 })
        .up({ button: 0 })
        .perform()
}

async function tryClick (selector, timeout = 10000) {
    const element = await $(selector)
    await element.waitForDisplayed({ timeout }).catch(() => {})
    if (await element.isDisplayed().catch(() => false)) {
        await element.click()
        return true
    }
    return false
}

async function completeOnboarding () {
    await browser.pause(15000)

    await tryClick(selectors.next)
    await browser.pause(3000)
    await tryClick(selectors.skipAlerts)
    await browser.pause(8000)
    await tryClick(selectors.agree)
    await tryClick(selectors.breakingNewsDismiss)
    await tryClick(selectors.tooltipClose)

    const homeTab = await $('~Home')
    await homeTab.waitForDisplayed({ timeout: 15000 })
}

async function installCapture () {
    const contexts = await browser.getContexts()
    const webview = contexts.find(context => context.startsWith('WEBVIEW'))
    if (!webview) return false

    await browser.switchContext(webview)
    await installAnalyticsCapture(browser)
    await browser.switchContext('NATIVE_APP')
    return true
}

async function collectCapturedAnalytics () {
    const contexts = await browser.getContexts()
    const webview = contexts.find(context => context.startsWith('WEBVIEW'))
    if (!webview) return []

    await browser.switchContext(webview)
    const events = await collectAnalyticsEvents(browser)
    await browser.switchContext('NATIVE_APP')
    return events
}

describe('CNN US Android App - Page View User Journey', () => {
    it('should navigate through the homepage journey and sign in', async function () {
        this.timeout(180000)

        await completeOnboarding()
        await installCapture()

        const homeFeed = await $(selectors.homeFeed)
        await homeFeed.waitForDisplayed({ timeout: 30000 })

        await browser.pause(12000)

        await tapAt(632, 165)
        await browser.pause(10000)

        await tapAt(1015, 165)
        await $(selectors.magicWall).waitForDisplayed({ timeout: 10000 })
        await $(selectors.magicWall).click()
        await browser.pause(3000)

        await tapAt(90, 155)
        await $('~Settings').waitForDisplayed({ timeout: 15000 })
        await $('~Settings').click()
        await browser.pause(3000)

        await tapAt(232, 422)
        await browser.pause(4000)

        const username = process.env.CNN_TEST_EMAIL
        const password = process.env.CNN_TEST_PASSWORD
        if (!username || !password) {
            throw new Error('CNN_TEST_EMAIL and CNN_TEST_PASSWORD must be set to run the sign-in portion of TC018')
        }

        const usernameInput = await $(selectors.username)
        await usernameInput.waitForDisplayed({ timeout: 15000 })
        await usernameInput.setValue(username)

        const passwordInput = await $(selectors.password)
        await passwordInput.setValue(password)
        await driver.hideKeyboard().catch(() => {})

        const signInButton = await $("//*[@clickable='true' and contains(@text,'Sign in')]")
        if (await signInButton.isDisplayed().catch(() => false)) {
            await signInButton.click()
        } else {
            await tapAt(540, 980)
        }

        await browser.pause(10000)

        const events = await collectCapturedAnalytics()
        const eventUrls = events.map(event => event.url).filter(Boolean)
        expect(eventUrls.some(url => /omtrdc\.net|2o7\.net|adobe\.com\/b\/ss/i.test(url)))
            .toBe(true)
        expect(eventUrls.some(url => /snowplowanalytics\.snowplow\/tp2/i.test(url)))
            .toBe(true)
    })
})