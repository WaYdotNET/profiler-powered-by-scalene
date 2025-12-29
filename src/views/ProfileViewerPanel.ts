/**
 * Profile Viewer Webview Panel
 * Displays profiling results with source code and complete metrics
 * Using Rosé Pine Dawn color palette for optimal readability
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { getConfig } from '../utils/config';
import { formatMemoryMb, formatPercent, isLikelyLeak } from '../utils/parser';
import type { ScaleneProfile, ScaleneLineData, ScaleneFunction } from '../types';

export class ProfileViewerPanel {
    private static instance: ProfileViewerPanel | undefined;
    private panel: vscode.WebviewPanel | undefined;
    private readonly extensionUri: vscode.Uri;

    private constructor(extensionUri: vscode.Uri) {
        this.extensionUri = extensionUri;
    }

    /**
     * Get or create the singleton instance
     */
    static getInstance(extensionUri: vscode.Uri): ProfileViewerPanel {
        if (!ProfileViewerPanel.instance) {
            ProfileViewerPanel.instance = new ProfileViewerPanel(extensionUri);
        }
        return ProfileViewerPanel.instance;
    }

    /**
     * Show the profile viewer with the given profile data
     */
    show(profile: ScaleneProfile): void {
        if (this.panel) {
            this.panel.reveal(vscode.ViewColumn.Two);
        } else {
            this.panel = vscode.window.createWebviewPanel(
                'profilerScaleneProfile',
                'Scalene Profile',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [this.extensionUri],
                }
            );

            this.panel.onDidDispose(() => {
                this.panel = undefined;
            });
        }

        this.panel.title = `Profile: ${path.basename(profile.program)}`;
        this.panel.webview.html = this.getHtml(profile);
    }

    /**
     * Dispose the panel
     */
    dispose(): void {
        this.panel?.dispose();
        this.panel = undefined;
    }

    /**
     * Generate the webview HTML content
     */
    private getHtml(profile: ScaleneProfile): string {
        const config = getConfig();
        const showLeaks = config.showMemoryLeaks;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scalene Profile</title>
    <style>${this.getStyles()}</style>
</head>
<body>
    ${this.renderHeader(profile)}
    ${this.renderTabs(showLeaks)}
    <div id="line-profile" class="tab-content active">
        ${this.renderLineProfile(profile)}
    </div>
    <div id="functions" class="tab-content">
        ${this.renderFunctionProfile(profile)}
    </div>
    ${showLeaks ? `<div id="leaks" class="tab-content">${this.renderLeakProfile(profile)}</div>` : ''}
    <div id="about" class="tab-content">
        ${this.renderAboutTab()}
    </div>
    ${this.renderFooter()}
    ${this.getScripts()}
</body>
</html>`;
    }

    /**
     * Render the header with summary statistics
     */
    private renderHeader(profile: ScaleneProfile): string {
        const growthColor = profile.growth_rate > 10000 ? '#b4637a' : profile.growth_rate > 1000 ? '#ea9d34' : '#286983';

        return `
        <div class="header">
            <h1>🔥 Profiler Powered by Scalene</h1>
            <div class="metadata">
                <div class="meta-item">
                    <span class="meta-label">Program:</span>
                    <span class="meta-value">${this.escapeHtml(profile.program)}</span>
                </div>
                ${profile.args.length > 1 ? `
                <div class="meta-item">
                    <span class="meta-label">Args:</span>
                    <span class="meta-value">${this.escapeHtml(profile.args.slice(1).join(' '))}</span>
                </div>
                ` : ''}
                ${profile.entrypoint_dir ? `
                <div class="meta-item">
                    <span class="meta-label">Directory:</span>
                    <span class="meta-value">${this.escapeHtml(profile.entrypoint_dir)}</span>
                </div>
                ` : ''}
            </div>
            <div class="stats">
                <div class="stat">
                    <div class="stat-label">⏱️ Elapsed Time</div>
                    <div class="stat-value time">${profile.elapsed_time.toFixed(3)}s</div>
                </div>
                <div class="stat">
                    <div class="stat-label">🧠 Peak Memory</div>
                    <div class="stat-value memory">${formatMemoryMb(profile.max_memory_mb)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">📈 Memory Growth</div>
                    <div class="stat-value growth" style="color: ${growthColor}">${formatMemoryMb(profile.total_memory_growth_mb)}</div>
                    <div class="stat-detail" style="color: ${growthColor}">${profile.growth_rate.toFixed(0)}% growth rate</div>
                </div>
                <div class="stat">
                    <div class="stat-label">🔥 CPU (Python)</div>
                    <div class="stat-value cpu">${formatPercent(profile.total_cpu_percent_python)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">⚙️ CPU (Native)</div>
                    <div class="stat-value cpu-native">${formatPercent(profile.total_cpu_percent_c)}</div>
                </div>
                <div class="stat">
                    <div class="stat-label">📊 Samples</div>
                    <div class="stat-value samples">${profile.alloc_samples} alloc${profile.free_samples > 0 ? ` / ${profile.free_samples} free` : ''}</div>
                </div>
            </div>
        </div>`;
    }

    /**
     * Render tabs
     */
    private renderTabs(showLeaks: boolean): string {
        return `
        <div class="tabs">
            <button class="tab active" onclick="showTab('line-profile')">📝 Line Profile</button>
            <button class="tab" onclick="showTab('functions')">⚡ Functions</button>
            ${showLeaks ? '<button class="tab" onclick="showTab(\'leaks\')">⚠️ Potential Leaks</button>' : ''}
            <button class="tab" onclick="showTab('about')">📖 About</button>
        </div>`;
    }

    /**
     * Render line-by-line profile
     */
    private renderLineProfile(profile: ScaleneProfile): string {
        let html = '';

        for (const [filePath, fileData] of Object.entries(profile.files)) {
            const lines = Object.values(fileData.lines).filter(line => {
                // Show only lines with significant data
                return (line.n_cpu_percent_python || 0) > 0.01 ||
                       (line.n_cpu_percent_c || 0) > 0.01 ||
                       (line.n_peak_mb || 0) > 0.01 ||
                       (line.n_growth_mb || 0) > 0.01;
            });

            if (lines.length === 0) {
                continue;
            }

            html += `
            <div class="file-section">
                <div class="file-header" onclick="toggleFile(this)">
                    <span class="file-toggle">▼</span>
                    <span class="file-path">${this.escapeHtml(filePath)}</span>
                    <span class="file-stats">${lines.length} significant lines</span>
                </div>
                <div class="file-content">
                    <table class="profile-table">
                        <thead>
                            <tr>
                                <th class="col-line">#</th>
                                <th class="col-code">Code</th>
                                <th class="col-cpu">CPU<br/>(Python)</th>
                                <th class="col-cpu">CPU<br/>(Native)</th>
                                <th class="col-memory">Memory<br/>(Peak)</th>
                                <th class="col-memory">Memory<br/>(Alloc)</th>
                                <th class="col-memory">Growth</th>
                                <th class="col-copy">Copy<br/>(MB/s)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${lines.map(line => this.renderLine(line)).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
        }

        return html || '<div class="empty">No significant profiling data found.</div>';
    }

    /**
     * Render a single line
     */
    private renderLine(line: ScaleneLineData): string {
        const cpuPython = line.n_cpu_percent_python || 0;
        const cpuNative = line.n_cpu_percent_c || 0;
        const peakMb = line.n_peak_mb || 0;
        const growthMb = line.n_growth_mb || 0;
        const isLeak = isLikelyLeak(line);

        const leakClass = isLeak ? 'leak-line' : '';
        const highCpuClass = (cpuPython + cpuNative) > 5 ? 'high-cpu' : '';

        return `
        <tr class="${leakClass} ${highCpuClass}">
            <td class="col-line">${line.lineno}</td>
            <td class="col-code"><code>${this.escapeHtml(line.code)}</code></td>
            <td class="col-cpu">${this.renderBar(cpuPython, 10, '#56949f', formatPercent(cpuPython))}</td>
            <td class="col-cpu">${this.renderBar(cpuNative, 10, '#ea9d34', formatPercent(cpuNative))}</td>
            <td class="col-memory">${this.renderBar(peakMb, 50, '#286983', formatMemoryMb(peakMb))}</td>
            <td class="col-memory"><strong>${formatMemoryMb(line.n_malloc_mb)}</strong></td>
            <td class="col-memory ${growthMb > 0 ? 'growth-positive' : ''}"><strong>${formatMemoryMb(growthMb)}</strong></td>
            <td class="col-copy"><strong>${(line.n_copy_mb_s || 0).toFixed(2)}</strong></td>
        </tr>`;
    }

    /**
     * Render function profile
     */
    private renderFunctionProfile(profile: ScaleneProfile): string {
        const allFunctions: Array<ScaleneFunction & { file: string }> = [];

        for (const [filePath, fileData] of Object.entries(profile.files)) {
            for (const func of fileData.functions) {
                allFunctions.push({ ...func, file: filePath });
            }
        }

        // Sort by CPU usage
        allFunctions.sort((a, b) => {
            const aCpu = (a.n_cpu_percent_python || 0) + (a.n_cpu_percent_c || 0);
            const bCpu = (b.n_cpu_percent_python || 0) + (b.n_cpu_percent_c || 0);
            return bCpu - aCpu;
        });

        if (allFunctions.length === 0) {
            return '<div class="empty">No function data available.</div>';
        }

        return `
        <div class="function-list">
            <table class="profile-table">
                <thead>
                    <tr>
                        <th class="col-function">Function</th>
                        <th class="col-location">Location</th>
                        <th class="col-cpu">CPU<br/>(Python)</th>
                        <th class="col-cpu">CPU<br/>(Native)</th>
                        <th class="col-memory">Memory<br/>(Peak)</th>
                        <th class="col-memory">Growth</th>
                        <th class="col-copy">Copy<br/>(MB/s)</th>
                    </tr>
                </thead>
                <tbody>
                    ${allFunctions.map(func => this.renderFunction(func)).join('')}
                </tbody>
            </table>
        </div>`;
    }

    /**
     * Render a single function
     */
    private renderFunction(func: ScaleneFunction & { file: string }): string {
        const cpuPython = func.n_cpu_percent_python || 0;
        const cpuNative = func.n_cpu_percent_c || 0;

        return `
        <tr>
            <td class="col-function"><code>${this.escapeHtml(func.name)}</code></td>
            <td class="col-location">${this.escapeHtml(path.basename(func.file))}:${func.lineno}</td>
            <td class="col-cpu">${this.renderBar(cpuPython, 10, '#56949f', formatPercent(cpuPython))}</td>
            <td class="col-cpu">${this.renderBar(cpuNative, 10, '#ea9d34', formatPercent(cpuNative))}</td>
            <td class="col-memory"><strong>${formatMemoryMb(func.n_peak_mb)}</strong></td>
            <td class="col-memory"><strong>${formatMemoryMb(func.n_growth_mb)}</strong></td>
            <td class="col-copy"><strong>${(func.n_copy_mb_s || 0).toFixed(2)}</strong></td>
        </tr>`;
    }

    /**
     * Render potential memory leaks
     */
    private renderLeakProfile(profile: ScaleneProfile): string {
        const leaks: Array<ScaleneLineData & { file: string }> = [];

        for (const [filePath, fileData] of Object.entries(profile.files)) {
            for (const line of Object.values(fileData.lines)) {
                if (isLikelyLeak(line)) {
                    leaks.push({ ...line, file: filePath });
                }
            }
        }

        // Sort by leak score
        leaks.sort((a, b) => (b.leak_score || 0) - (a.leak_score || 0));

        if (leaks.length === 0) {
            return '<div class="empty success">✅ No potential memory leaks detected!</div>';
        }

        return `
        <div class="leak-warning">
            ⚠️ Found ${leaks.length} potential memory leak(s). These lines show significant memory growth.
        </div>
        <div class="leak-list">
            <table class="profile-table">
                <thead>
                    <tr>
                        <th class="col-score">Score</th>
                        <th class="col-location">Location</th>
                        <th class="col-code">Code</th>
                        <th class="col-memory">Growth</th>
                        <th class="col-memory">Peak</th>
                    </tr>
                </thead>
                <tbody>
                    ${leaks.map(leak => this.renderLeak(leak)).join('')}
                </tbody>
            </table>
        </div>`;
    }

    /**
     * Render a single leak entry
     */
    private renderLeak(leak: ScaleneLineData & { file: string }): string {
        const score = leak.leak_score || 0;
        const scoreBadge = score > 150 ? '🔴 CRITICAL' : score > 100 ? '🟠 HIGH' : '🟡 MEDIUM';

        return `
        <tr class="leak-row">
            <td class="col-score">
                <span class="leak-badge">${scoreBadge}</span>
                <div class="leak-score">${score.toFixed(0)}</div>
            </td>
            <td class="col-location">
                ${this.escapeHtml(path.basename(leak.file))}:${leak.lineno}
            </td>
            <td class="col-code"><code>${this.escapeHtml(leak.code)}</code></td>
            <td class="col-memory growth-positive">${formatMemoryMb(leak.n_growth_mb)}</td>
            <td class="col-memory">${formatMemoryMb(leak.n_peak_mb)}</td>
        </tr>`;
    }

    /**
     * Render a progress bar with label
     */
    private renderBar(value: number, max: number, color: string, label?: string): string {
        if (!value || value === 0) {
            return '-';
        }

        const percentage = Math.min((value / max) * 100, 100);
        const displayLabel = label || formatPercent(value);

        return `
        <div class="bar-container">
            <div class="bar" style="width: ${percentage}%; background-color: ${color};"></div>
            <span class="bar-label">${displayLabel}</span>
        </div>`;
    }

    /**
     * Render About tab with metrics explanation
     */
    private renderAboutTab(): string {
        return `
        <div class="about-section">
            <h2>📖 Understanding the Metrics</h2>
            <p class="about-intro">
                This profile was generated by <strong>Scalene</strong>, a high-performance CPU, GPU, and memory profiler for Python.
                Below is a comprehensive guide to understanding the profiling data.
            </p>

            <h3>🔥 CPU Metrics</h3>
            <table class="info-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Description</th>
                        <th>What to Look For</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>CPU (Python)</strong></td>
                        <td>Time spent executing Python code on this line</td>
                        <td>High values indicate code <strong>you can optimize</strong> (pure Python logic)</td>
                    </tr>
                    <tr>
                        <td><strong>CPU (Native)</strong></td>
                        <td>Time spent in C/C++ libraries (NumPy, pandas, etc.)</td>
                        <td>High values suggest library bottlenecks or inefficient algorithms</td>
                    </tr>
                </tbody>
            </table>

            <h3>💾 Memory Metrics</h3>
            <table class="info-table">
                <thead>
                    <tr>
                        <th>Metric</th>
                        <th>Description</th>
                        <th>What to Look For</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Memory (Peak)</strong></td>
                        <td>Peak memory allocated on this line</td>
                        <td>Find lines that allocate large amounts of memory</td>
                    </tr>
                    <tr>
                        <td><strong>Memory (Alloc)</strong></td>
                        <td>Average memory allocated per execution</td>
                        <td>Understand typical memory usage patterns</td>
                    </tr>
                    <tr>
                        <td><strong>Growth</strong></td>
                        <td>Net memory growth (allocated - freed)</td>
                        <td><strong>Positive growth = potential memory leak!</strong> 🚨</td>
                    </tr>
                    <tr>
                        <td><strong>Copy (MB/s)</strong></td>
                        <td>Rate of memory copying operations</td>
                        <td>High values indicate inefficient data handling (unnecessary copies)</td>
                    </tr>
                </tbody>
            </table>

            <h3>🚨 Memory Leak Detection</h3>
            <table class="info-table">
                <thead>
                    <tr>
                        <th>Indicator</th>
                        <th>Description</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Leak Score</strong></td>
                        <td>Calculated based on growth rate, allocation patterns, and usage</td>
                        <td>Score > 150 = 🔴 CRITICAL, > 100 = 🟠 HIGH, > 50 = 🟡 MEDIUM</td>
                    </tr>
                    <tr>
                        <td><strong>Growth Rate</strong></td>
                        <td>Overall memory growth percentage</td>
                        <td>> 200% = likely leak, > 110% = investigate</td>
                    </tr>
                    <tr>
                        <td><strong>Pink Highlights</strong></td>
                        <td>Lines with significant memory growth in the Line Profile tab</td>
                        <td>Review these lines for unclosed resources or accumulating data</td>
                    </tr>
                </tbody>
            </table>

            <h3>📊 Statistical Information</h3>
            <table class="info-table">
                <thead>
                    <tr>
                        <th>Field</th>
                        <th>Description</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><strong>Elapsed Time</strong></td>
                        <td>Total profiling duration (wall-clock time)</td>
                    </tr>
                    <tr>
                        <td><strong>Samples</strong></td>
                        <td>Number of memory allocation and free operations captured</td>
                    </tr>
                    <tr>
                        <td><strong>Program</strong></td>
                        <td>Python script or module that was profiled</td>
                    </tr>
                    <tr>
                        <td><strong>Args</strong></td>
                        <td>Command-line arguments passed to the program</td>
                    </tr>
                </tbody>
            </table>

            <h3>🎨 Color Coding (Rosé Pine Dawn)</h3>
            <table class="info-table">
                <thead>
                    <tr>
                        <th>Color</th>
                        <th>Element</th>
                        <th>Meaning</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td><span class="color-chip" style="background: #56949f;"></span> <strong>Foam (Teal)</strong></td>
                        <td>CPU (Python) bars</td>
                        <td>Python code execution time</td>
                    </tr>
                    <tr>
                        <td><span class="color-chip" style="background: #ea9d34;"></span> <strong>Gold</strong></td>
                        <td>CPU (Native) bars, high CPU lines</td>
                        <td>Native/C code, performance hotspots</td>
                    </tr>
                    <tr>
                        <td><span class="color-chip" style="background: #286983;"></span> <strong>Pine (Blue)</strong></td>
                        <td>Memory bars, headers</td>
                        <td>Memory-related metrics</td>
                    </tr>
                    <tr>
                        <td><span class="color-chip" style="background: #b4637a;"></span> <strong>Love (Rose)</strong></td>
                        <td>Leak warnings, growth values</td>
                        <td>Critical issues requiring attention</td>
                    </tr>
                </tbody>
            </table>

            <h3>💡 Quick Tips</h3>
            <ul class="tips-list">
                <li><strong>High CPU (Python)?</strong> → Optimize your Python code (use comprehensions, built-ins, caching)</li>
                <li><strong>High CPU (Native)?</strong> → Check algorithm efficiency or library usage</li>
                <li><strong>High Memory (Peak)?</strong> → Consider streaming, chunking, or generators instead of loading all data</li>
                <li><strong>Positive Growth?</strong> → Check for unclosed files, accumulating caches, or circular references</li>
                <li><strong>High Copy rate?</strong> → Avoid unnecessary data copying (use views, inplace operations)</li>
                <li><strong>Many samples?</strong> → More data = more reliable statistics</li>
            </ul>

            <h3>📚 Learn More</h3>
            <div class="learn-more">
                <p>
                    Scalene uses <strong>sampling-based profiling</strong> with minimal overhead, separating Python from native code,
                    and provides <strong>line-level granularity</strong> for pinpoint accuracy.
                </p>
                <p>
                    For advanced features like GPU profiling and AI-powered optimization suggestions, visit the
                    <a href="https://github.com/plasma-umass/scalene" target="_blank">Scalene GitHub repository</a>.
                </p>
            </div>
        </div>`;
    }

    /**
     * Render footer with links
     */
    private renderFooter(): string {
        return `
        <footer class="footer">
            <div class="footer-content">
                <div class="footer-section">
                    <strong>Profiled with</strong>
                    <a href="https://github.com/plasma-umass/scalene" target="_blank">
                        Scalene
                    </a>
                    <span class="footer-separator">•</span>
                    <span>by Emery Berger, Sam Stern, and Juan Altmayer Pizzorno</span>
                </div>
                <div class="footer-section">
                    <strong>Extension by</strong>
                    <a href="https://github.com/WaYdotNET" target="_blank">
                        Carlo Bertini (WaYdotNET)
                    </a>
                    <span class="footer-separator">•</span>
                    <a href="https://github.com/WaYdotNET/profiler-powered-by-scalene" target="_blank">
                        GitHub Repository
                    </a>
                </div>
                <div class="footer-section">
                    <span>Theme: <a href="https://rosepinetheme.com" target="_blank">Rosé Pine Dawn</a></span>
                    <span class="footer-separator">•</span>
                    <span>Open Source • Apache 2.0 License</span>
                </div>
            </div>
        </footer>`;
    }

    /**
     * Escape HTML special characters
     */
    private escapeHtml(text: string): string {
        const div = text.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
        return div;
    }

    /**
     * Get CSS styles - Rosé Pine Dawn theme for maximum readability
     */
    private getStyles(): string {
        return `
        /* Rosé Pine Dawn Color Palette */
        :root {
            --rp-base: #faf4ed;
            --rp-surface: #fffaf3;
            --rp-overlay: #f2e9e1;
            --rp-muted: #9893a5;
            --rp-subtle: #797593;
            --rp-text: #575279;
            --rp-love: #b4637a;
            --rp-gold: #ea9d34;
            --rp-rose: #d7827e;
            --rp-pine: #286983;
            --rp-foam: #56949f;
            --rp-iris: #907aa9;
            --rp-highlight-low: #f4ede8;
            --rp-highlight-med: #dfdad9;
            --rp-highlight-high: #cecacd;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--vscode-font-family), -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
            font-size: 14px;
            color: var(--rp-text);
            background-color: var(--rp-base);
            padding: 20px;
            line-height: 1.6;
        }

        .header {
            background: var(--rp-surface);
            padding: 24px;
            border-radius: 8px;
            margin-bottom: 20px;
            border: 2px solid var(--rp-highlight-med);
        }

        h1 {
            font-size: 26px;
            margin-bottom: 16px;
            color: var(--rp-pine);
            font-weight: 700;
        }

        .metadata {
            display: flex;
            flex-wrap: wrap;
            gap: 24px;
            margin-bottom: 16px;
            font-size: 13px;
        }

        .meta-item {
            display: flex;
            gap: 8px;
        }

        .meta-label {
            font-weight: 700;
            color: var(--rp-subtle);
        }

        .meta-value {
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace;
            color: var(--rp-text);
            font-weight: 500;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .stat {
            background: var(--rp-highlight-low);
            padding: 14px;
            border-radius: 6px;
            border: 1px solid var(--rp-highlight-med);
        }

        .stat-label {
            font-size: 11px;
            color: var(--rp-subtle);
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }

        .stat-value {
            font-size: 20px;
            font-weight: 700;
            font-family: 'SF Mono', Monaco, monospace;
            color: var(--rp-text);
        }

        .stat-detail {
            font-size: 11px;
            margin-top: 4px;
            font-weight: 600;
        }

        .tabs {
            display: flex;
            gap: 2px;
            margin-bottom: 20px;
            border-bottom: 2px solid var(--rp-highlight-med);
        }

        .tab {
            background: transparent;
            border: none;
            color: var(--rp-text);
            padding: 12px 24px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            border-bottom: 3px solid transparent;
            transition: all 0.2s;
        }

        .tab:hover {
            background: var(--rp-highlight-low);
            color: var(--rp-pine);
        }

        .tab.active {
            border-bottom-color: var(--rp-pine);
            color: var(--rp-pine);
        }

        .tab-content {
            display: none;
        }

        .tab-content.active {
            display: block;
        }

        .file-section {
            margin-bottom: 20px;
            border: 2px solid var(--rp-highlight-med);
            border-radius: 8px;
            overflow: hidden;
            background: var(--rp-surface);
        }

        .file-header {
            background: var(--rp-highlight-low);
            padding: 14px 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 700;
            border-bottom: 2px solid var(--rp-highlight-med);
        }

        .file-header:hover {
            background: var(--rp-highlight-med);
        }

        .file-toggle {
            transition: transform 0.2s;
            color: var(--rp-pine);
            font-weight: bold;
        }

        .file-header.collapsed .file-toggle {
            transform: rotate(-90deg);
        }

        .file-path {
            flex: 1;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 13px;
            color: var(--rp-text);
        }

        .file-stats {
            color: var(--rp-muted);
            font-size: 12px;
            font-weight: 600;
        }

        .file-content {
            max-height: 600px;
            overflow: auto;
        }

        .file-header.collapsed + .file-content {
            display: none;
        }

        .profile-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
        }

        .profile-table thead {
            background: var(--rp-overlay);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .profile-table th {
            padding: 12px 10px;
            text-align: left;
            font-weight: 700;
            border-bottom: 2px solid var(--rp-highlight-high);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--rp-text);
        }

        .profile-table td {
            padding: 10px;
            border-bottom: 1px solid var(--rp-highlight-med);
            font-size: 13px;
        }

        .profile-table tbody tr {
            background: var(--rp-surface);
        }

        .profile-table tbody tr:nth-child(even) {
            background: var(--rp-base);
        }

        .profile-table tbody tr:hover {
            background: var(--rp-highlight-low) !important;
        }

        .col-line {
            width: 60px;
            text-align: right;
            color: var(--rp-muted);
            font-family: 'SF Mono', Monaco, monospace;
            font-weight: 600;
            font-size: 12px;
        }

        .col-code {
            min-width: 400px;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 13px;
        }

        .col-cpu, .col-memory, .col-copy {
            width: 140px;
            text-align: right;
            font-size: 13px;
            font-weight: 600;
        }

        .col-function {
            min-width: 220px;
            font-size: 13px;
        }

        .col-location {
            width: 200px;
            font-family: 'SF Mono', Monaco, monospace;
            font-size: 12px;
            color: var(--rp-muted);
        }

        .col-score {
            width: 140px;
            text-align: center;
        }

        code {
            background: var(--rp-overlay);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
            color: var(--rp-text);
            border: 1px solid var(--rp-highlight-med);
            font-size: 13px;
            line-height: 1.7;
            font-weight: 500;
        }

        .bar-container {
            position: relative;
            height: 28px;
            background: var(--rp-overlay);
            border-radius: 5px;
            overflow: visible;
            border: 2px solid var(--rp-highlight-med);
            display: inline-block;
            min-width: 90px;
        }

        .bar {
            height: 100%;
            min-width: 4px;
            transition: width 0.3s;
            opacity: 0.85;
            border-radius: 3px;
        }

        .bar-label {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            font-size: 12px;
            font-weight: 800;
            color: var(--rp-text);
            text-shadow:
                -1px -1px 0 var(--rp-base),
                1px -1px 0 var(--rp-base),
                -1px 1px 0 var(--rp-base),
                1px 1px 0 var(--rp-base),
                0 0 3px var(--rp-base);
            letter-spacing: 0.3px;
        }

        .leak-line {
            background: rgba(180, 99, 122, 0.12) !important;
            border-left: 4px solid var(--rp-love);
        }

        .high-cpu {
            background: rgba(234, 157, 52, 0.12) !important;
            border-left: 4px solid var(--rp-gold);
        }

        .growth-positive {
            color: var(--rp-love) !important;
            font-weight: 700;
            font-size: 13px;
        }

        .leak-warning {
            background: rgba(180, 99, 122, 0.15);
            border: 3px solid var(--rp-love);
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 20px;
            font-weight: 700;
            color: var(--rp-love);
            font-size: 14px;
        }

        .leak-badge {
            display: inline-block;
            padding: 5px 10px;
            border-radius: 5px;
            font-size: 11px;
            font-weight: 700;
            background: var(--rp-love);
            color: var(--rp-base);
            letter-spacing: 0.5px;
        }

        .leak-score {
            font-size: 22px;
            font-weight: 700;
            margin-top: 6px;
            color: var(--rp-love);
        }

        .leak-row {
            background: rgba(180, 99, 122, 0.08) !important;
            border-left: 4px solid var(--rp-love);
        }

        .empty {
            padding: 50px;
            text-align: center;
            color: var(--rp-muted);
            font-size: 15px;
        }

        .empty.success {
            color: var(--rp-pine);
            font-size: 17px;
            font-weight: 600;
        }

        /* About Section Styles */
        .about-section {
            padding: 30px;
            max-width: 1200px;
            margin: 0 auto;
        }

        .about-section h2 {
            color: var(--rp-pine);
            font-size: 24px;
            margin-bottom: 20px;
            border-bottom: 3px solid var(--rp-highlight-med);
            padding-bottom: 10px;
        }

        .about-section h3 {
            color: var(--rp-text);
            font-size: 18px;
            margin-top: 30px;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .about-intro {
            font-size: 15px;
            line-height: 1.8;
            margin-bottom: 30px;
            padding: 20px;
            background: var(--rp-highlight-low);
            border-left: 4px solid var(--rp-pine);
            border-radius: 4px;
        }

        .info-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 14px;
            background: var(--rp-surface);
            border: 2px solid var(--rp-highlight-med);
            border-radius: 8px;
            overflow: hidden;
        }

        .info-table thead {
            background: var(--rp-overlay);
        }

        .info-table th {
            padding: 14px 16px;
            text-align: left;
            font-weight: 700;
            color: var(--rp-text);
            border-bottom: 2px solid var(--rp-highlight-high);
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .info-table td {
            padding: 12px 16px;
            border-bottom: 1px solid var(--rp-highlight-med);
            vertical-align: top;
            line-height: 1.6;
        }

        .info-table tbody tr:last-child td {
            border-bottom: none;
        }

        .info-table tbody tr:nth-child(even) {
            background: var(--rp-base);
        }

        .info-table tbody tr:hover {
            background: var(--rp-highlight-low);
        }

        .info-table td:first-child {
            font-weight: 600;
            color: var(--rp-text);
            width: 180px;
        }

        .color-chip {
            display: inline-block;
            width: 20px;
            height: 20px;
            border-radius: 4px;
            vertical-align: middle;
            margin-right: 8px;
            border: 2px solid var(--rp-highlight-high);
        }

        .tips-list {
            list-style: none;
            padding: 0;
            margin: 20px 0;
        }

        .tips-list li {
            padding: 12px 16px;
            margin-bottom: 10px;
            background: var(--rp-highlight-low);
            border-left: 4px solid var(--rp-foam);
            border-radius: 4px;
            line-height: 1.6;
        }

        .tips-list li strong {
            color: var(--rp-pine);
        }

        .learn-more {
            background: var(--rp-surface);
            padding: 20px;
            border-radius: 8px;
            border: 2px solid var(--rp-highlight-med);
            margin-top: 20px;
            line-height: 1.8;
        }

        .learn-more p {
            margin-bottom: 12px;
        }

        .learn-more p:last-child {
            margin-bottom: 0;
        }

        .learn-more a {
            color: var(--rp-pine);
            font-weight: 600;
            text-decoration: none;
            border-bottom: 2px solid var(--rp-foam);
            transition: all 0.2s;
        }

        .learn-more a:hover {
            color: var(--rp-foam);
            border-bottom-color: var(--rp-pine);
        }

        /* Footer Styles */
        .footer {
            background: var(--rp-overlay);
            border-top: 3px solid var(--rp-highlight-high);
            padding: 24px 30px;
            margin-top: 40px;
            font-size: 13px;
        }

        .footer-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .footer-section {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            color: var(--rp-subtle);
        }

        .footer-section strong {
            color: var(--rp-text);
            font-weight: 600;
        }

        .footer-separator {
            color: var(--rp-muted);
            margin: 0 4px;
        }

        .footer a {
            color: var(--rp-pine);
            text-decoration: none;
            font-weight: 600;
            border-bottom: 1px solid transparent;
            transition: all 0.2s;
        }

        .footer a:hover {
            color: var(--rp-foam);
            border-bottom-color: var(--rp-foam);
        }

        /* Link Styles (Global) */
        a {
            color: var(--rp-pine);
            text-decoration: none;
            font-weight: 600;
            transition: color 0.2s;
        }

        a:hover {
            color: var(--rp-foam);
        }

        a[target="_blank"]::after {
            content: " ↗";
            font-size: 0.8em;
            vertical-align: super;
        }
        `;
    }

    /**
     * Get JavaScript code
     */
    private getScripts(): string {
        return `
        <script>
            function showTab(tabId) {
                // Hide all tabs
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });
                document.querySelectorAll('.tab').forEach(tab => {
                    tab.classList.remove('active');
                });

                // Show selected tab
                document.getElementById(tabId).classList.add('active');
                event.target.classList.add('active');
            }

            function toggleFile(element) {
                element.classList.toggle('collapsed');
            }
        </script>`;
    }
}
