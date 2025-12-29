/**
 * Parser for Scalene JSON profiles
 * Transforms raw Scalene output into normalized format for display
 */

import type {
    RawScaleneProfile,
    RawScaleneFile,
    RawScaleneLine,
    RawScaleneFunction,
    ScaleneProfile,
    ScaleneFileData,
    ScaleneLineData,
    ScaleneFunction,
} from '../types';

/**
 * Parse and normalize a Scalene profile from raw JSON format
 */
export function parseScaleneProfile(raw: RawScaleneProfile): ScaleneProfile {
    // Calculate aggregate statistics
    let maxMemoryMb = 0;
    let totalMemoryGrowthMb = 0;
    let totalCpuPython = 0;
    let totalCpuC = 0;
    let totalSys = 0;

    // Parse files
    const files: Record<string, ScaleneFileData> = {};

    for (const [filePath, fileData] of Object.entries(raw.files)) {
        const normalizedFile = parseScaleneFile(fileData);
        files[filePath] = normalizedFile;

        // Aggregate statistics
        for (const lineData of Object.values(normalizedFile.lines)) {
            if (lineData.n_peak_mb && lineData.n_peak_mb > maxMemoryMb) {
                maxMemoryMb = lineData.n_peak_mb;
            }
            if (lineData.n_growth_mb) {
                totalMemoryGrowthMb += lineData.n_growth_mb;
            }
            if (lineData.n_cpu_percent_python) {
                totalCpuPython += lineData.n_cpu_percent_python;
            }
            if (lineData.n_cpu_percent_c) {
                totalCpuC += lineData.n_cpu_percent_c;
            }
            if (lineData.n_sys_percent) {
                totalSys += lineData.n_sys_percent;
            }
        }
    }

    // Calculate growth rate (as percentage)
    const growthRate = maxMemoryMb > 0 ? (totalMemoryGrowthMb / maxMemoryMb) * 100 : 0;

    return {
        program: raw.args?.[0] || raw.filename || 'Unknown',
        args: raw.args || [],
        elapsed_time: raw.elapsed_time_sec,
        entrypoint_dir: raw.entrypoint_dir || '',
        max_memory_mb: maxMemoryMb,
        total_memory_growth_mb: totalMemoryGrowthMb,
        growth_rate: growthRate,
        total_cpu_percent_python: totalCpuPython,
        total_cpu_percent_c: totalCpuC,
        total_sys_percent: totalSys,
        alloc_samples: raw.alloc_samples || 0,
        free_samples: raw.free_samples || 0,
        files,
    };
}

/**
 * Parse a single file's profiling data
 */
function parseScaleneFile(raw: RawScaleneFile): ScaleneFileData {
    // Convert lines array to keyed object
    const lines: Record<number, ScaleneLineData> = {};

    for (const line of raw.lines) {
        const lineData = parseScaleneLine(line, raw.leaks);
        lines[line.lineno] = lineData;
    }

    // Parse functions
    const functions: ScaleneFunction[] = raw.functions
        .map(parseScaleneFunction)
        .filter((f): f is ScaleneFunction => f !== null);

    return {
        lines,
        functions,
        leaks: raw.leaks || {},
    };
}

/**
 * Parse a single line's profiling data
 */
function parseScaleneLine(raw: RawScaleneLine, leaks?: Record<string, number>): ScaleneLineData {
    // Calculate leak score based on growth and usage patterns
    const leakScore = calculateLeakScore(raw, leaks);

    return {
        lineno: raw.lineno,
        code: raw.line,

        // CPU metrics
        n_cpu_percent_python: raw.n_cpu_percent_python,
        n_cpu_percent_c: raw.n_cpu_percent_c,
        n_sys_percent: raw.n_sys_percent,
        n_core_utilization: raw.n_core_utilization,
        cpu_samples_count: raw.cpu_samples_list?.length || 0,

        // Memory metrics
        n_malloc_mb: raw.n_malloc_mb,
        n_peak_mb: raw.n_peak_mb,
        n_avg_mb: raw.n_avg_mb,
        n_growth_mb: raw.n_growth_mb,
        n_python_fraction: raw.n_python_fraction,
        n_usage_fraction: raw.n_usage_fraction,
        n_copy_mb_s: raw.n_copy_mb_s,
        n_mallocs: raw.n_mallocs,
        memory_samples_count: raw.memory_samples?.length || 0,

        // GPU metrics
        n_gpu_percent: raw.n_gpu_percent,
        n_gpu_peak_memory_mb: raw.n_gpu_peak_memory_mb,
        n_gpu_avg_memory_mb: raw.n_gpu_avg_memory_mb,

        // Leak detection
        leak_score: leakScore,
    };
}

/**
 * Parse function profiling data
 */
function parseScaleneFunction(raw: RawScaleneFunction): ScaleneFunction | null {
    if (!raw.name || !raw.lineno) {
        return null;
    }

    return {
        name: raw.name,
        lineno: raw.lineno,
        n_cpu_percent_python: raw.n_cpu_percent_python,
        n_cpu_percent_c: raw.n_cpu_percent_c,
        n_sys_percent: raw.n_sys_percent,
        n_malloc_mb: raw.n_malloc_mb,
        n_peak_mb: raw.n_peak_mb,
        n_growth_mb: raw.n_growth_mb,
        n_copy_mb_s: raw.n_copy_mb_s,
    };
}

/**
 * Calculate a leak score for a line
 * Higher score = more likely to be a leak
 */
function calculateLeakScore(line: RawScaleneLine, leaks?: Record<string, number>): number {
    let score = 0;

    // Check if explicitly marked as leak by Scalene
    if (leaks && leaks[String(line.lineno)]) {
        score += leaks[String(line.lineno)];
    }

    // Memory growth is the primary indicator
    if (line.n_growth_mb && line.n_growth_mb > 0) {
        score += line.n_growth_mb * 10; // Weight growth heavily
    }

    // High memory allocation with growth
    if (line.n_malloc_mb && line.n_malloc_mb > 0 && line.n_growth_mb && line.n_growth_mb > 0) {
        score += line.n_malloc_mb * 5;
    }

    // Low usage fraction with growth suggests accumulation
    if (line.n_usage_fraction !== undefined && line.n_usage_fraction < 0.3 &&
        line.n_growth_mb && line.n_growth_mb > 0) {
        score += 20;
    }

    return score;
}

/**
 * Check if a line is likely a memory leak
 */
export function isLikelyLeak(line: ScaleneLineData, threshold: number = 50): boolean {
    return (line.leak_score || 0) > threshold;
}

/**
 * Format memory size in MB to human-readable string
 */
export function formatMemoryMb(mb: number | undefined): string {
    if (mb === undefined || mb === 0) {
        return '-';
    }
    if (mb < 0.01) {
        return '<0.01 MB';
    }
    if (mb < 1) {
        return mb.toFixed(2) + ' MB';
    }
    if (mb < 1000) {
        return mb.toFixed(1) + ' MB';
    }
    return (mb / 1024).toFixed(2) + ' GB';
}

/**
 * Format percentage to human-readable string
 */
export function formatPercent(value: number | undefined): string {
    if (value === undefined || value === 0) {
        return '-';
    }
    if (value < 0.01) {
        return '<0.01%';
    }
    return value.toFixed(2) + '%';
}
