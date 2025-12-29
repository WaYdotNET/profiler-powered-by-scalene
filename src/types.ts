/**
 * Type definitions for the Scalene profiler extension
 */

/** Raw Scalene JSON format (as output by Scalene) */
export interface RawScaleneProfile {
    alloc_samples?: number;
    free_samples?: number;
    args?: string[];
    elapsed_time_sec: number;
    entrypoint_dir?: string;
    filename?: string;
    files: Record<string, RawScaleneFile>;
    growth_rate?: number;
}

export interface RawScaleneFile {
    lines: RawScaleneLine[];
    functions: RawScaleneFunction[];
    imports?: string[];
    leaks?: Record<string, number>;
}

export interface RawScaleneLine {
    lineno: number;
    line: string;
    // CPU metrics
    n_cpu_percent_python?: number;
    n_cpu_percent_c?: number;
    n_sys_percent?: number;
    n_core_utilization?: number;
    cpu_samples_list?: number[];
    // Memory metrics
    n_malloc_mb?: number;
    n_peak_mb?: number;
    n_avg_mb?: number;
    n_growth_mb?: number;
    n_python_fraction?: number;
    n_usage_fraction?: number;
    n_copy_mb_s?: number;
    n_mallocs?: number;
    memory_samples?: Array<[number, number]>;
    // GPU metrics
    n_gpu_percent?: number;
    n_gpu_peak_memory_mb?: number;
    n_gpu_avg_memory_mb?: number;
    // Region info
    start_region_line?: number;
    end_region_line?: number;
    start_outermost_loop?: number;
    end_outermost_loop?: number;
}

export interface RawScaleneFunction {
    name?: string;
    lineno?: number;
    n_cpu_percent_python?: number;
    n_cpu_percent_c?: number;
    n_sys_percent?: number;
    n_malloc_mb?: number;
    n_peak_mb?: number;
    n_growth_mb?: number;
    n_copy_mb_s?: number;
}

/** Normalized Scalene profile (internal format for display) */
export interface ScaleneProfile {
    // Metadata
    program: string;
    args: string[];
    elapsed_time: number;
    entrypoint_dir: string;

    // Aggregate statistics
    max_memory_mb: number;
    total_memory_growth_mb: number;
    growth_rate: number;
    total_cpu_percent_python: number;
    total_cpu_percent_c: number;
    total_sys_percent: number;
    alloc_samples: number;
    free_samples: number;

    // Per-file data
    files: Record<string, ScaleneFileData>;
}

export interface ScaleneFileData {
    lines: Record<number, ScaleneLineData>;
    functions: ScaleneFunction[];
    leaks: Record<string, number>;
}

/** Complete line metrics from Scalene */
export interface ScaleneLineData {
    lineno: number;
    code: string;

    // CPU metrics
    n_cpu_percent_python?: number;
    n_cpu_percent_c?: number;
    n_sys_percent?: number;
    n_core_utilization?: number;
    cpu_samples_count?: number;

    // Memory metrics
    n_malloc_mb?: number;
    n_peak_mb?: number;
    n_avg_mb?: number;
    n_growth_mb?: number;
    n_python_fraction?: number;
    n_usage_fraction?: number;
    n_copy_mb_s?: number;
    n_mallocs?: number;
    memory_samples_count?: number;

    // GPU metrics
    n_gpu_percent?: number;
    n_gpu_peak_memory_mb?: number;
    n_gpu_avg_memory_mb?: number;

    // Leak detection
    leak_score?: number;
}

export interface ScaleneFunction {
    name: string;
    lineno: number;
    n_cpu_percent_python?: number;
    n_cpu_percent_c?: number;
    n_sys_percent?: number;
    n_malloc_mb?: number;
    n_peak_mb?: number;
    n_growth_mb?: number;
    n_copy_mb_s?: number;
}

/** Profiling options */
export interface ProfileOptions {
    /** Focus on memory profiling with lower CPU sampling */
    memoryFocus?: boolean;
    /** Indicates this is a temporary file (for region profiling) */
    isTemp?: boolean;
    /** Start line for region profiling */
    startLine?: number;
    /** End line for region profiling */
    endLine?: number;
}

/** Extension configuration */
export interface ExtensionConfig {
    pythonPath: string;
    cpuSamplingRate: number;
    reducedProfile: boolean;
    outputDirectory: string;
    autoOpenViewer: boolean;
    showMemoryLeaks: boolean;
}

/** Leak data for display */
export interface LeakData {
    file: string;
    line: number;
    score: number;
    memory: number;
    code: string;
}

/** Line data with source code */
export interface LineWithCode {
    lineNum: number;
    code: string;
    data: ScaleneLineData;
}

/** File content cache */
export interface SourceFile {
    path: string;
    lines: string[];
}
