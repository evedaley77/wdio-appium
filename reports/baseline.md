TEST BASELINE
--------------

Framework:
Node.js v26.5.1
WebdriverIO 9.31.7
Appium 3.7.0
BrowserStack SDK 9.35.2

Android Tests:
NOT YET MEASURED

Pass:
NOT YET MEASURED

Fail:
NOT YET MEASURED

Confirm Network logging:
NOT YET MEASURED

Known issues:
- CNN app content-load flakiness: the app intermittently renders "Something went wrong" / "The content you requested either failed to load or is unavailable. Tap Try Again to reload this content." This is the dominant failure mode and it is application-side, not framework-side.
- Historical aggregate pass rate is ~52% (65 passed / 61 failed across 126 sessions recorded in log/sdk-cli.log). TC-001 alone is 28 passed / 29 failed. These are historical log-derived figures, not the result of a run of this baseline.
- 15 of the 20 Android specs have zero recorded executions on BrowserStack. Only TC-001, TC-003, TC-005, TC-007 and TC-019 have ever run; TC-002, TC-004, TC-006, TC-008, TC-010, TC-011, TC-012, TC-013, TC-014, TC-015, TC-016, TC-017, TC-018, TC-020 and TC-021 have not.
- Network logging is configured but unconfirmed: config/wdio.androidbs.conf.js, config/wdio.analytics.conf.js and config/wdio.browserstack.conf.js all set bstack:options.networkLogs true and wire the HAR download afterSession hook, but no run has been able to produce a HAR. The root wdio.conf.js (local Appium) does neither, so it will always report Disabled.

Notes:
- No test run has produced this file. BrowserStack is unreachable from the environment where this baseline was authored (DNS for *.browserstack.com fails with ENOTFOUND), so every count above is literally NOT YET MEASURED rather than estimated.
- The framework versions above were read from the installed node_modules tree on the authoring machine. The generated report reads them at runtime from the environment that actually runs the suite, so they may differ.
- To replace this file with measured numbers, run any of the wired configs (for example `npm run wdio:androidbs`, `npm run wdio:analytics` or `npm run wdio:browserstack`) from a network where BrowserStack is reachable. The onComplete hook in test/support/baseline.report.js overwrites reports/baseline.md and writes reports/baseline.json from the launcher's real results.
- Counts in the generated report are spec-file level, which is the granularity the WebdriverIO launcher reports to onComplete.
