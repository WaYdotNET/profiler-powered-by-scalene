/**
 * Configuration utilities
 */

import * as vscode from 'vscode';
import { CONFIG_NAMESPACE, ConfigKeys, Defaults } from '../constants';
import type { ExtensionConfig } from '../types';

/**
 * Get the extension configuration
 */
export function getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);

    return {
        pythonPath: config.get<string>(ConfigKeys.PYTHON_PATH, ''),
        cpuSamplingRate: config.get<number>(ConfigKeys.CPU_SAMPLING_RATE, Defaults.CPU_SAMPLING_RATE),
        reducedProfile: config.get<boolean>(ConfigKeys.REDUCED_PROFILE, Defaults.REDUCED_PROFILE),
        outputDirectory: config.get<string>(ConfigKeys.OUTPUT_DIRECTORY, Defaults.OUTPUT_DIRECTORY),
        autoOpenViewer: config.get<boolean>(ConfigKeys.AUTO_OPEN_VIEWER, Defaults.AUTO_OPEN_VIEWER),
        showMemoryLeaks: config.get<boolean>(ConfigKeys.SHOW_MEMORY_LEAKS, Defaults.SHOW_MEMORY_LEAKS),
    };
}

/**
 * Get a specific configuration value
 */
export function getConfigValue<T>(key: string, defaultValue: T): T {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    return config.get<T>(key, defaultValue);
}
