/**
 * Extension constants
 * Centralized configuration for command IDs, settings keys, and other constants
 */

export const EXTENSION_ID = 'profiler-powered-by-scalene';
export const EXTENSION_NAME = 'Profiler Powered by Scalene';

/** Configuration namespace - different from original to avoid conflicts */
export const CONFIG_NAMESPACE = 'profilerScalene';

/** Command IDs */
export const Commands = {
    PROFILE: `${CONFIG_NAMESPACE}.profile`,
    PROFILE_MEMORY: `${CONFIG_NAMESPACE}.profileMemory`,
    PROFILE_REGION: `${CONFIG_NAMESPACE}.profileRegion`,
    VIEW_PROFILE: `${CONFIG_NAMESPACE}.viewProfile`,
    VIEW_IN_BROWSER: `${CONFIG_NAMESPACE}.viewInBrowser`,
    STOP: `${CONFIG_NAMESPACE}.stop`,
    INSTALL: `${CONFIG_NAMESPACE}.install`,
} as const;

/** Configuration keys */
export const ConfigKeys = {
    PYTHON_PATH: 'pythonPath',
    CPU_SAMPLING_RATE: 'cpuSamplingRate',
    REDUCED_PROFILE: 'reducedProfile',
    OUTPUT_DIRECTORY: 'outputDirectory',
    AUTO_OPEN_VIEWER: 'autoOpenViewer',
    SHOW_MEMORY_LEAKS: 'showMemoryLeaks',
} as const;

/** Default configuration values */
export const Defaults = {
    CPU_SAMPLING_RATE: 0.01,
    OUTPUT_DIRECTORY: '.scalene-profiles',
    REDUCED_PROFILE: true,
    AUTO_OPEN_VIEWER: true,
    SHOW_MEMORY_LEAKS: true,
} as const;

/** Output channel name */
export const OUTPUT_CHANNEL_NAME = 'Profiler (Scalene)';
