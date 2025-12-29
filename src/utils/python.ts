/**
 * Python detection and Scalene utilities
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { getConfig } from './config';

const execAsync = promisify(exec);

/** Package manager type */
export type PackageManager = 'uv' | 'pip';

/** Installation context */
export interface InstallContext {
    packageManager: PackageManager;
    workspaceRoot: string | null;
    hasPyproject: boolean;
    hasUv: boolean;
}

/**
 * Detect the Python interpreter path
 * Tries the VS Code Python extension first, then falls back to system python
 */
export async function detectPython(): Promise<string> {
    const config = getConfig();

    // Use configured path if available
    if (config.pythonPath) {
        return config.pythonPath;
    }

    // Try Python extension
    try {
        const pythonExt = vscode.extensions.getExtension('ms-python.python');
        if (pythonExt) {
            const api = (await pythonExt.activate()) as {
                settings?: {
                    getExecutionDetails?: () => { execCommand?: string[] };
                };
            };
            const execCommand = api?.settings?.getExecutionDetails?.()?.execCommand;
            if (execCommand?.[0]) {
                return execCommand[0];
            }
        }
    } catch {
        // Ignore errors, fall back to default
    }

    return 'python3';
}

/**
 * Check if Scalene is installed
 */
export async function checkScalene(pythonPath: string): Promise<boolean> {
    try {
        await execAsync(`${pythonPath} -m scalene --version`);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if uv package manager is available
 */
export async function checkUv(): Promise<boolean> {
    try {
        await execAsync('uv --version');
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if pyproject.toml exists in the workspace
 */
export function hasPyproject(): boolean {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
        return false;
    }

    const pyprojectPath = path.join(workspaceFolder.uri.fsPath, 'pyproject.toml');
    return fs.existsSync(pyprojectPath);
}

/**
 * Get the workspace root path
 */
export function getWorkspaceRoot(): string | null {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
}

/**
 * Detect the installation context (uv vs pip)
 */
export async function detectInstallContext(): Promise<InstallContext> {
    const hasUv = await checkUv();
    const hasPyprojectFile = hasPyproject();
    const workspaceRoot = getWorkspaceRoot();

    // Use uv if both uv is available AND pyproject.toml exists
    const packageManager: PackageManager = hasUv && hasPyprojectFile ? 'uv' : 'pip';

    return {
        packageManager,
        workspaceRoot,
        hasPyproject: hasPyprojectFile,
        hasUv,
    };
}

/**
 * Install Scalene using the appropriate package manager
 * Uses uv if available and pyproject.toml exists, otherwise uses pip
 */
export async function installScalene(
    pythonPath: string,
    outputChannel: vscode.OutputChannel
): Promise<boolean> {
    const context = await detectInstallContext();

    outputChannel.clear();
    outputChannel.show();

    if (context.packageManager === 'uv') {
        return installWithUv(outputChannel, context.workspaceRoot);
    } else {
        return installWithPip(pythonPath, outputChannel);
    }
}

/**
 * Install Scalene using uv
 */
async function installWithUv(
    outputChannel: vscode.OutputChannel,
    workspaceRoot: string | null
): Promise<boolean> {
    return new Promise((resolve) => {
        outputChannel.appendLine('📦 Installing Scalene with uv...');
        outputChannel.appendLine('   (detected pyproject.toml in workspace)\n');

        const cwd = workspaceRoot ?? process.cwd();
        const proc = spawn('uv', ['add', 'scalene'], { cwd });

        proc.stdout.on('data', (data: Buffer) => {
            outputChannel.append(data.toString());
        });

        proc.stderr.on('data', (data: Buffer) => {
            outputChannel.append(data.toString());
        });

        proc.on('close', (code) => {
            if (code === 0) {
                outputChannel.appendLine('\n✅ Scalene installed successfully with uv!');
                void vscode.window.showInformationMessage('Scalene installed successfully with uv!');
                resolve(true);
            } else {
                outputChannel.appendLine('\n❌ Installation with uv failed, trying pip...');
                // Fallback to pip
                void installWithPipFallback(outputChannel).then(resolve);
            }
        });

        proc.on('error', () => {
            outputChannel.appendLine('\n❌ uv command failed, trying pip...');
            void installWithPipFallback(outputChannel).then(resolve);
        });
    });
}

/**
 * Install Scalene using pip
 */
async function installWithPip(
    pythonPath: string,
    outputChannel: vscode.OutputChannel
): Promise<boolean> {
    return new Promise((resolve) => {
        outputChannel.appendLine('📦 Installing Scalene with pip...\n');

        const proc = spawn(pythonPath, ['-m', 'pip', 'install', '-U', 'scalene']);

        proc.stdout.on('data', (data: Buffer) => {
            outputChannel.append(data.toString());
        });

        proc.stderr.on('data', (data: Buffer) => {
            outputChannel.append(data.toString());
        });

        proc.on('close', (code) => {
            if (code === 0) {
                outputChannel.appendLine('\n✅ Scalene installed successfully!');
                void vscode.window.showInformationMessage('Scalene installed successfully!');
                resolve(true);
            } else {
                outputChannel.appendLine('\n❌ Installation failed');
                void vscode.window.showErrorMessage(
                    'Failed to install Scalene. Try: pip install scalene'
                );
                resolve(false);
            }
        });
    });
}

/**
 * Fallback pip installation (used when uv fails)
 */
async function installWithPipFallback(outputChannel: vscode.OutputChannel): Promise<boolean> {
    const pythonPath = await detectPython();
    return installWithPip(pythonPath, outputChannel);
}
