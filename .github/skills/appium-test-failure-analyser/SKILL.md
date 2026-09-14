---
name: appium-test-failure-analyser
description: 'Analyse Appium, WebdriverIO, Android, and BrowserStack test failures. Use when reviewing test results, Appium errors, failed specs, timeouts, crashes, locator problems, device or environment issues, or BrowserStack execution failures.'
argument-hint: 'Provide the test result, failed spec, log file, Appium error, or report directory to analyse.'
user-invocable: true
---

# Appium Test Failure Analyser

## Purpose

Turn an Appium test failure into an evidence-backed diagnosis, a recommended fix, and a concise summary. Analyse the supplied result first and inspect repository artifacts only as needed to fill gaps.

## Procedure

1. Identify the available evidence and its scope.
   - Read the supplied test result, report, terminal output, or log.
   - Record the failed spec, test case, command, platform, device, OS version, app or URL, and execution provider when available.
   - Locate related artifacts such as screenshots, page source, Appium server logs, WebdriverIO logs, BrowserStack session details, videos, and performance reports.
   - Do not treat missing artifacts as proof that a failure did not occur.

2. Isolate the first meaningful failure.
   - Separate the first actionable error from retries, cascading assertion failures, teardown errors, and cleanup noise.
   - Capture the exact error message, relevant stack trace, command or locator, elapsed time, and the last successful step.
   - Preserve the original wording of the Appium error when quoting evidence.

3. Classify the primary failure using the following categories.
   - **Locator failure**: the element was not found, was not displayed or enabled, or the selector matched the wrong UI. Evidence commonly includes `NoSuchElement`, invalid or stale selectors, changed page source, or an incorrect context.
   - **Timeout**: a wait or command exceeded its configured limit without evidence of a crash or infrastructure outage. Evidence commonly includes `Timeout`, `waitUntil`, `element displayed`, or command timeout messages.
   - **Application crash**: the tested app closed, became unresponsive, or reported a fatal exception. Confirm with device logs, crash dialogs, logcat, a terminated session, or a screenshot showing the crash.
   - **Environment issue**: the device, emulator, driver, app installation, network, permissions, WebDriver service, or local configuration prevented the test from running correctly. Examples include unavailable devices, session creation failures, incompatible capabilities, missing binaries, port conflicts, and connectivity failures.
   - **BrowserStack issue**: BrowserStack infrastructure or session provisioning failed independently of the test logic. Use BrowserStack session status, dashboard details, provider error codes, hub responses, and concurrent-session or quota evidence.
   - Choose one primary category. Mention secondary contributing factors separately when justified.
   - If the evidence is insufficient, state `Unconfirmed`, list the competing categories, and name the single artifact or rerun that would disambiguate them. Do not guess.

4. Inspect the Appium error in context.
   - Explain what the error means at the WebdriverIO/Appium/device boundary.
   - Check whether the error is a symptom of an earlier failure, such as a missing element caused by an app crash or a timeout caused by a lost session.
   - For context-sensitive failures, compare the active automation context, page source, screenshot, capabilities, and preceding navigation step.

5. Recommend the smallest useful fix.
   - Tie each recommendation to observed evidence.
   - For locator failures, propose a verified selector or context/navigation correction and identify the page object or spec that should change.
   - For timeouts, identify the blocked condition and recommend correcting synchronization, app readiness, or the timeout only when the wait is otherwise valid.
   - For crashes, recommend checking the app build and device logs, then fixing or quarantining the app defect rather than weakening the test.
   - For environment issues, recommend the specific capability, driver, device, installation, permission, network, or configuration check implicated by the log.
   - For BrowserStack issues, recommend validating the session, provider status, quota/concurrency, capabilities, and a local or alternate-device rerun.
   - Include a focused validation or rerun command when it can be determined from the repository.

6. Produce the final summary using this format:

```text
Failure: <spec/test and short symptom>
Primary classification: <Locator failure | Timeout | Application crash | Environment issue | BrowserStack issue | Unconfirmed>
Confidence: <High | Medium | Low>
Appium error: <exact error or concise excerpt>
Evidence: <most relevant log, result, screenshot, page source, or session evidence>
Likely cause: <one sentence>
Recommended fix: <specific next change or investigation>
Validation: <focused rerun or check, or state what evidence is still needed>
Secondary factors: <none, or concise list>
```

## Quality Checks

- Every classification is supported by a quoted error, artifact, or explicit absence of expected evidence.
- The first actionable failure is distinguished from downstream failures.
- Appium errors are interpreted in relation to the device, application, driver, and automation context.
- The recommendation is specific enough to act on and does not hide uncertainty.
- The summary names the failed test and gives one primary classification.
- No credentials, access keys, session tokens, or other secrets from configuration or logs are copied into the summary.
