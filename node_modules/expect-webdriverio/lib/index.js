import { expect as expectLib } from 'expect';
import * as wdioMatchers from './matchers.js';
import { DEFAULT_OPTIONS, defaultOptionsList } from './constants.js';
import createSoftExpect from './softExpect.js';
import { SoftAssertService } from './softAssert.js';
import { oneOf } from './matchers/asymmetrics/oneOf.js';
export const wdioCustomMatchers = {};
export const matchers = new Map();
const extend = expectLib.extend;
expectLib.extend = (extendedMatchers) => {
    if (!extendedMatchers || typeof extendedMatchers !== 'object') {
        return;
    }
    Object.entries(extendedMatchers).forEach(([name, matcher]) => {
        wdioCustomMatchers[name] = matcher;
        matchers.set(name, matcher);
    });
    return extend(extendedMatchers);
};
const filteredWdioMatchers = {};
Object.entries(wdioMatchers).forEach(([matcher, value]) => {
    if (typeof value === 'function') {
        filteredWdioMatchers[matcher] = value;
    }
});
const wdioExpect = expectLib;
wdioExpect.extend(filteredWdioMatchers);
wdioExpect.oneOf = oneOf;
Object.defineProperty(wdioExpect, 'soft', {
    value: (actual) => createSoftExpect(actual)
});
Object.defineProperty(wdioExpect, 'getSoftFailures', {
    value: (testId) => SoftAssertService.getInstance().getFailures(testId)
});
Object.defineProperty(wdioExpect, 'assertSoftFailures', {
    value: (testId) => SoftAssertService.getInstance().assertNoFailures(testId)
});
Object.defineProperty(wdioExpect, 'clearSoftFailures', {
    value: (testId) => SoftAssertService.getInstance().clearFailures(testId)
});
export const expect = wdioExpect;
export const getDefaultOptions = () => DEFAULT_OPTIONS;
export const setDefaultOptions = (options) => {
    Object.entries(options).forEach(([key, value]) => {
        defaultOptionsList.forEach((option) => {
            if (key in option) {
                option[key] = value;
            }
        });
    });
};
export const setFeatureFlags = (featureFlags) => {
    Object.entries(featureFlags).forEach(([ffName, ffValue]) => {
        defaultOptionsList.forEach((option) => {
            option.featureFlags[ffName] = ffValue;
        });
    });
};
export const setOptions = setDefaultOptions;
export const getConfig = getDefaultOptions;
export { SnapshotService } from './snapshot.js';
export { SoftAssertService } from './softAssert.js';
export { SoftAssertionService } from './softAssertService.js';
export * as utils from './utils.js';
