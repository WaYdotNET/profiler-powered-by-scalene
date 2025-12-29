/**
 * Scalene profiler runner
 * Handles spawning and managing the Scalene process
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { getConfig } from '../utils/config';
import { detectPython, checkScalene, installScalene } from '../utils/python';
import { generateProfilePath } from '../utils/files';
import { Commands } from '../constants';
import type { ProfileOptions } from '../types';

export class ScaleneRunner {
    private process: ChildProcess | null = null;
    private outputChannel: vscode.OutputChannel;
    private statusBarItem: vscode.StatusBarItem;
    private lastProfilePath: string | null = null;

    constructor(outputChannel: vscode.OutputChannel, statusBarItem: vscode.StatusBarItem) {
        this.outputChannel = outputChannel;
        this.statusBarItem = statusBarItem;
    }

    /**
     * Get the last profile path
     */
    getLastProfilePath(): string | null {
        return this.lastProfilePath;
    }

    /**
     * Set the last profile path (used when finding existing profiles)
     */
    setLastProfilePath(profilePath: string): void {
        this.lastProfilePath = profilePath;
    }

    /**
     * Check if a profiling session is running
     */
    isRunning(): boolean {
        return this.process !== null;
    }

    /**
     * Run Scalene on a file
     */
    async run(filePath: string, options: ProfileOptions = {}): Promise<string | null> {
        // Check if already running
        if (this.process) {
            const choice = await vscode.window.showWarningMessage(
                'A profiling session is already running. Stop it?',
                'Yes',
                'No'
            );
            if (choice !== 'Yes') {
                return null;
            }
            this.stop();
        }

        const config = getConfig();
        const pythonPath = config.pythonPath || (await detectPython());

        // Check if Scalene is installed
        const scaleneAvailable = await checkScalene(pythonPath);
        if (!scaleneAvailable) {
            const choice = await vscode.window.showErrorMessage(
                'Scalene not found. Would you like to install it?',
                'Install',
                'Cancel'
            );
            if (choice === 'Install') {
                const installed = await installScalene(pythonPath, this.outputChannel);
                if (!installed) {
                    return null;
                }
            } else {
                return null;
            }
        }

        // Generate profile path
        const profilePath = generateProfilePath(filePath);
        this.lastProfilePath = profilePath;

        // Build command arguments
        const args = this.buildArgs(filePath, profilePath, options);

        // Update UI
        this.showRunningState();
        this.logStart(filePath, pythonPath, profilePath, options);

        return new Promise((resolve, reject) => {
            this.outputChannel.appendLine(`$ ${pythonPath} ${args.join(' ')}\n`);

            this.process = spawn(pythonPath, args, {
                cwd: path.dirname(filePath),
                env: { ...process.env },
            });

            this.process.stdout?.on('data', (data: Buffer) => {
                this.outputChannel.append(data.toString());
            });

            this.process.stderr?.on('data', (data: Buffer) => {
                this.outputChannel.append(data.toString());
            });

            this.process.on('close', (code) => {
                this.process = null;
                this.showIdleState();

                this.outputChannel.appendLine('');
                this.outputChannel.appendLine('━'.repeat(60));

                if (code === 0) {
                    this.outputChannel.appendLine('✅ Profiling complete!');
                    this.outputChannel.appendLine(`📊 Profile saved: ${profilePath}`);

                    if (config.autoOpenViewer) {
                        void vscode.commands.executeCommand(Commands.VIEW_PROFILE);
                    }

                    void this.showCompletionNotification();
                    resolve(profilePath);
                } else {
                    this.outputChannel.appendLine(`❌ Profiling failed (exit code: ${code})`);
                    reject(new Error(`Scalene exited with code ${code}`));
                }
            });

            this.process.on('error', (err) => {
                this.process = null;
                this.showIdleState();
                this.outputChannel.appendLine(`❌ Error: ${err.message}`);
                void vscode.window.showErrorMessage(`Profiler error: ${err.message}`);
                reject(err);
            });
        });
    }

    /**
     * Stop the current profiling session
     */
    stop(): void {
        if (this.process) {
            this.process.kill('SIGTERM');
            this.process = null;
            this.outputChannel.appendLine('\n⏹ Profiling stopped by user');
            this.showIdleState();
        }
    }

    /**
     * Build Scalene command arguments
     */
    private buildArgs(filePath: string, profilePath: string, options: ProfileOptions): string[] {
        const config = getConfig();
        const args = ['-m', 'scalene', 'run'];

        if (config.reducedProfile) {
            args.push('--reduced-profile');
        }

        if (options.memoryFocus) {
            args.push('--cpu-sampling-rate', '0.001');
        } else {
            args.push('--cpu-sampling-rate', config.cpuSamplingRate.toString());
        }

        args.push('--json', '--outfile', profilePath);
        args.push('--', filePath);

        return args;
    }

    /**
     * Log profiling start information
     */
    private logStart(
        filePath: string,
        pythonPath: string,
        profilePath: string,
        options: ProfileOptions
    ): void {
        this.outputChannel.clear();
        this.outputChannel.show();
        this.outputChannel.appendLine('🔥 Profiler Powered by Scalene');
        this.outputChannel.appendLine('━'.repeat(60));
        this.outputChannel.appendLine(`📄 File: ${options.isTemp ? 'Selected Code' : filePath}`);
        this.outputChannel.appendLine(`🐍 Python: ${pythonPath}`);
        this.outputChannel.appendLine(`📊 Output: ${profilePath}`);
        this.outputChannel.appendLine('━'.repeat(60));
        this.outputChannel.appendLine('');
    }

    /**
     * Show running state in status bar
     */
    private showRunningState(): void {
        this.statusBarItem.text = '$(sync~spin) Profiling...';
        this.statusBarItem.tooltip = 'Click to stop profiling';
        this.statusBarItem.command = Commands.STOP;
    }

    /**
     * Show idle state in status bar
     */
    private showIdleState(): void {
        this.statusBarItem.text = '$(flame) Profiler';
        this.statusBarItem.tooltip = 'Profile with Scalene';
        this.statusBarItem.command = Commands.PROFILE;
    }

    /**
     * Show completion notification with actions
     */
    private async showCompletionNotification(): Promise<void> {
        const choice = await vscode.window.showInformationMessage(
            'Profiling complete!',
            'View Profile',
            'Open in Browser'
        );

        if (choice === 'View Profile') {
            await vscode.commands.executeCommand(Commands.VIEW_PROFILE);
        } else if (choice === 'Open in Browser') {
            await vscode.commands.executeCommand(Commands.VIEW_IN_BROWSER);
        }
    }
}
