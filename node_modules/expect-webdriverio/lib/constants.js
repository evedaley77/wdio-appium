export const DEFAULT_FEATURE_FLAGS = {
    useToHaveTextStrictMultiElementsCompareStrategy: false
};
export const DEFAULT_OPTIONS = {
    wait: 2000,
    interval: 100,
    beforeAssertion: async () => { },
    afterAssertion: async () => { },
    featureFlags: DEFAULT_FEATURE_FLAGS
};
export const DEFAULT_OPTIONS_TO_BE_DISPLAYED = {
    ...DEFAULT_OPTIONS,
    withinViewport: false,
    contentVisibilityAuto: true,
    opacityProperty: true,
    visibilityProperty: true
};
export const defaultOptionsList = [
    DEFAULT_OPTIONS,
    DEFAULT_OPTIONS_TO_BE_DISPLAYED
];
