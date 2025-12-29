/**
 * File system utilities
 */

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getConfig } from './config';
import type { SourceFile } from '../types';

/**
 * Get the output directory for profile files
 * Creates the directory if it doesn't exist
 */
export function getOutputDir(): string {
    const config = getConfig();
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspaceFolder) {
        const fullPath = path.join(workspaceFolder.uri.fsPath, config.outputDirectory);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
        }
        return fullPath;
    }

    return config.outputDirectory;
}

/**
 * Generate a timestamped profile filename
 */
export function generateProfilePath(filePath: string): string {
    const outputDir = getOutputDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baseName = path.basename(filePath, '.py');
    return path.join(outputDir, `${baseName}-${timestamp}.json`);
}

/**
 * Find the most recent profile file
 */
export function findLatestProfile(): string | null {
    const outputDir = getOutputDir();

    if (!fs.existsSync(outputDir)) {
        return null;
    }

    const files = fs
        .readdirSync(outputDir)
        .filter((f) => f.endsWith('.json'))
        .map((f) => ({
            name: f,
            path: path.join(outputDir, f),
            time: fs.statSync(path.join(outputDir, f)).mtime.getTime(),
        }))
        .sort((a, b) => b.time - a.time);

    return files.length > 0 ? files[0].path : null;
}

/**
 * Read a profile file
 */
export function readProfileFile<T>(filePath: string): T | null {
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(content) as T;
    } catch {
        return null;
    }
}

/**
 * Read source file and cache it
 */
export function readSourceFile(filePath: string): SourceFile | null {
    try {
        // Handle absolute and relative paths
        let fullPath = filePath;

        // If relative path, try to resolve from workspace
        if (!path.isAbsolute(filePath)) {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (workspaceFolder) {
                fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
            }
        }

        if (!fs.existsSync(fullPath)) {
            return null;
        }

        const content = fs.readFileSync(fullPath, 'utf-8');
        const lines = content.split('\n');

        return {
            path: filePath,
            lines,
        };
    } catch {
        return null;
    }
}

/**
 * Get a specific line from a source file
 */
export function getSourceLine(filePath: string, lineNum: number): string {
    const sourceFile = readSourceFile(filePath);
    if (!sourceFile || lineNum < 1 || lineNum > sourceFile.lines.length) {
        return '';
    }
    return sourceFile.lines[lineNum - 1];
}

/**
 * Resolve file path relative to workspace or profile location
 */
export function resolveFilePath(filePath: string, profilePath: string): string {
    // If absolute, return as is
    if (path.isAbsolute(filePath)) {
        return filePath;
    }

    // Try workspace root first
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
        const wsPath = path.join(workspaceFolder.uri.fsPath, filePath);
        if (fs.existsSync(wsPath)) {
            return wsPath;
        }
    }

    // Try relative to profile location
    const profileDir = path.dirname(profilePath);
    const relPath = path.join(profileDir, filePath);
    if (fs.existsSync(relPath)) {
        return relPath;
    }

    return filePath;
}
