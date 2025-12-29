/**
 * Command handlers
 * Registers and implements all VS Code commands for the extension
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Commands } from '../constants';
import { ScaleneRunner } from '../profiler';
import { ProfileViewerPanel } from '../views';
import {
    detectPython,
    findLatestProfile,
    readProfileFile,
    getOutputDir,
    installScalene as installScaleneUtil,
} from '../utils';
import { parseScaleneProfile } from '../utils/parser';
import type { RawScaleneProfile } from '../types';

/**
 * Register all extension commands
 */
export function registerCommands(
    context: vscode.ExtensionContext,
    runner: ScaleneRunner,
    outputChannel: vscode.OutputChannel
): void {
    const viewer = ProfileViewerPanel.getInstance(context.extensionUri);

    // Profile current file
    context.subscriptions.push(
        vscode.commands.registerCommand(Commands.PROFILE, () => profileFile(runner))
    );

    // Profile with memory focus
    context.subscriptions.push(
        vscode.commands.registerCommand(Commands.PROFILE_MEMORY, () =>
            profileFile(runner, { memoryFocus: true })
        )
    );

    // Profile selected region
    context.subscriptions.push(
        vscode.commands.registerCommand(Commands.PROFILE_REGION, () => profileRegion(runner))
    );

    // View last profile
    context.subscriptions.push(
        vscode.commands.registerCommand(Commands.VIEW_PROFILE, () => viewProfile(runner, viewer))
    );

    // View in browser
    context.subscriptions.push(
        vscode.commands.registerCommand(Commands.VIEW_IN_BROWSER, () => viewInBrowser(runner))
    );

    // Stop profiling
    context.subscriptions.push(vscode.commands.registerCommand(Commands.STOP, () => runner.stop()));

    // Install Scalene
    context.subscriptions.push(
        vscode.commands.registerCommand(Commands.INSTALL, () => installScalene(outputChannel))
    );
}

/**
 * Profile the current file
 */
async function profileFile(
    runner: ScaleneRunner,
    options: { memoryFocus?: boolean } = {}
): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
        void vscode.window.showErrorMessage('No active Python file');
        return;
    }

    if (editor.document.languageId !== 'python') {
        void vscode.window.showErrorMessage('Profiler only works with Python files');
        return;
    }

    // Save file before profiling
    await editor.document.save();

    try {
        await runner.run(editor.document.uri.fsPath, options);
    } catch (error) {
        // Error is already logged by the runner
    }
}

/**
 * Profile the selected code region
 */
async function profileRegion(runner: ScaleneRunner): Promise<void> {
    const editor = vscode.window.activeTextEditor;

    if (!editor || editor.document.languageId !== 'python') {
        void vscode.window.showErrorMessage('No active Python file');
        return;
    }

    const selection = editor.selection;
    if (selection.isEmpty) {
        void vscode.window.showErrorMessage('No code selected. Select the code you want to profile.');
        return;
    }

    // Create temp file with selected code
    const outputDir = getOutputDir();
    const tempFile = path.join(outputDir, `_profiler_selection_${Date.now()}.py`);

    // Get imports from the original file
    const fullText = editor.document.getText();
    const imports = fullText
        .split('\n')
        .filter((line) => line.trim().startsWith('import ') || line.trim().startsWith('from '))
        .join('\n');

    const selectedCode = editor.document.getText(selection);
    const wrappedCode = `${imports}\n\n# Selected code for profiling:\n${selectedCode}`;

    fs.writeFileSync(tempFile, wrappedCode);

    try {
        await runner.run(tempFile, { isTemp: true });
    } finally {
        // Cleanup temp file
        try {
            fs.unlinkSync(tempFile);
        } catch {
            // Ignore cleanup errors
        }
    }
}

/**
 * View the last profile
 */
function viewProfile(runner: ScaleneRunner, viewer: ProfileViewerPanel): void {
    let profilePath = runner.getLastProfilePath();

    // Try to find the latest profile if none is set
    if (!profilePath) {
        profilePath = findLatestProfile();
        if (profilePath) {
            runner.setLastProfilePath(profilePath);
        }
    }

    if (!profilePath || !fs.existsSync(profilePath)) {
        void vscode.window.showWarningMessage('No profile found. Run a profile first.');
        return;
    }

    const rawProfile = readProfileFile<RawScaleneProfile>(profilePath);
    if (!rawProfile) {
        void vscode.window.showErrorMessage('Failed to read profile file.');
        return;
    }

    // Parse and normalize the raw Scalene JSON
    const profile = parseScaleneProfile(rawProfile);

    viewer.show(profile);
}

/**
 * View the profile in the Scalene web browser
 */
async function viewInBrowser(runner: ScaleneRunner): Promise<void> {
    const profilePath = runner.getLastProfilePath();

    if (!profilePath || !fs.existsSync(profilePath)) {
        void vscode.window.showWarningMessage('No profile found. Run a profile first.');
        return;
    }

    const pythonPath = await detectPython();

    const terminal = vscode.window.createTerminal('Scalene Viewer');
    terminal.show();
    terminal.sendText(
        `cd "${path.dirname(profilePath)}" && ${pythonPath} -m scalene view "${profilePath}"`
    );
}

/**
 * Install Scalene
 * Uses uv if available and pyproject.toml exists, otherwise uses pip
 */
async function installScalene(outputChannel: vscode.OutputChannel): Promise<void> {
    const pythonPath = await detectPython();
    await installScaleneUtil(pythonPath, outputChannel);
}
