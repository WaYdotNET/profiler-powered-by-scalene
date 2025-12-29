/**
 * Profiler Powered by Scalene - VS Code Extension
 *
 * An enhanced Scalene profiler extension for VS Code and compatible editors.
 * Inspired by https://github.com/plasma-umass/scalene-vscode-extension
 *
 * @author Carlo Bertini (WaYdotNET) - https://github.com/WaYdotNET
 * @license Apache-2.0
 */

import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME, Commands } from './constants';
import { ScaleneRunner } from './profiler';
import { ProfileViewerPanel } from './views';
import { registerCommands } from './commands';

let outputChannel: vscode.OutputChannel;
let statusBarItem: vscode.StatusBarItem;
let runner: ScaleneRunner;

/**
 * Extension activation
 * Called when the extension is activated (on Python file open)
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('Profiler Powered by Scalene extension is now active');

    // Create output channel
    outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    context.subscriptions.push(outputChannel);

    // Create status bar item
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(flame) Profiler';
    statusBarItem.tooltip = 'Profile with Scalene';
    statusBarItem.command = Commands.PROFILE;
    context.subscriptions.push(statusBarItem);

    // Create profiler runner
    runner = new ScaleneRunner(outputChannel, statusBarItem);

    // Register commands
    registerCommands(context, runner, outputChannel);

    // Show/hide status bar based on active editor
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor((editor) => {
            updateStatusBarVisibility(editor);
        })
    );

    // Initial visibility check
    updateStatusBarVisibility(vscode.window.activeTextEditor);
}

/**
 * Update status bar visibility based on the active editor
 */
function updateStatusBarVisibility(editor: vscode.TextEditor | undefined): void {
    if (editor && editor.document.languageId === 'python') {
        statusBarItem.show();
    } else {
        statusBarItem.hide();
    }
}

/**
 * Extension deactivation
 * Called when the extension is deactivated
 */
export function deactivate(): void {
    runner?.stop();
    ProfileViewerPanel.getInstance(vscode.Uri.file('')).dispose();
}
