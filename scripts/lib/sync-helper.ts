/**
 * sync-helper.ts
 *
 * Provides a generic, reusable function for syncing files and directories
 * to a target Git repository. This abstracts the common logic used by
 * both sync-to-stocksunify.ts (V1) and sync-to-stocksunify2.ts (V2).
 */

import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

export interface SyncConfig {
  repoName: string;
  repoUrl: string;
  targetDir: string;
  filesToCopy?: Array<{ source: string; dest: string }>;
  directoriesToCopy?: Array<{ source: string; dest: string }>;
  commitMessage: string;
}

export function syncToRepo(config: SyncConfig) {
  console.log(`🚀 Starting sync for ${config.repoName}...`);

  ensureRepo(config.repoUrl, config.targetDir);

  if (config.filesToCopy) {
    copyFiles(config.filesToCopy, config.targetDir);
  }
  if (config.directoriesToCopy) {
    copyDirectories(config.directoriesToCopy, config.targetDir);
  }

  commitAndPush(config.targetDir, config.commitMessage);

  console.log(`\n✅ Sync complete for ${config.repoName}!`);
  console.log(`   - Directory: ${config.targetDir}`);
  console.log(`   - Repository: ${config.repoUrl}`);
}

function ensureRepo(repoUrl: string, targetDir: string) {
  const originalCwd = process.cwd();
  try {
    if (!fs.existsSync(targetDir)) {
      console.log(`📦 Cloning ${repoUrl}...`);
      execSync(`git clone ${repoUrl} "${targetDir}"`, { stdio: "inherit" });
    } else {
      console.log(`🔄 Updating repository at ${targetDir}...`);
      process.chdir(targetDir);
      try {
        execSync("git pull origin main", { stdio: "inherit" });
      } catch (error) {
        console.warn(
          "⚠️ Could not pull latest changes (repo might be empty or new). Continuing...",
        );
      }
    }
  } finally {
    process.chdir(originalCwd);
  }
}

function copyRecursive(src: string, dest: string) {
  if (!fs.existsSync(src)) {
    console.warn(`  - ⚠️ Source directory not found, skipping: ${src}`);
    return;
  }

  const stats = fs.statSync(src);
  const isDirectory = stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(
        path.join(src, childItemName),
        path.join(dest, childItemName),
      );
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

function copyDirectories(
  directoriesToCopy: Array<{ source: string; dest: string }>,
  targetBaseDir: string,
) {
  console.log("📁 Copying directories...");
  directoriesToCopy.forEach(({ source, dest }) => {
    const fullSourcePath = path.join(process.cwd(), source);
    const fullDestPath = path.join(targetBaseDir, dest);
    copyRecursive(fullSourcePath, fullDestPath);
    console.log(`  - Copied directory ${source} to ${dest}`);
  });
}

function copyFiles(
  filesToCopy: Array<{ source: string; dest: string }>,
  targetBaseDir: string,
) {
  console.log("📋 Copying files...");
  filesToCopy.forEach(({ source, dest }) => {
    const fullSourcePath = path.join(process.cwd(), source);
    const fullDestPath = path.join(targetBaseDir, dest);

    if (fs.existsSync(fullSourcePath)) {
      const destDir = path.dirname(fullDestPath);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      fs.copyFileSync(fullSourcePath, fullDestPath);
      console.log(`  - Copied file ${source} to ${dest}`);
    } else {
      console.warn(`  - ⚠️ Source file not found, skipping: ${source}`);
    }
  });
}

function commitAndPush(targetDir: string, commitMessage: string) {
  console.log("💾 Committing and pushing changes...");
  const originalCwd = process.cwd();
  process.chdir(targetDir);

  try {
    const status = execSync("git status --porcelain", { encoding: "utf-8" });
    if (!status.trim()) {
      console.log("  - ℹ️ No changes to commit.");
      return;
    }

    execSync("git add -A", { stdio: "inherit" });
    execSync(`git commit -m "${commitMessage}"`, { stdio: "inherit" });
    execSync("git push origin main", { stdio: "inherit" });
    console.log("  - ✅ Pushed to remote repository.");
  } catch (error: any) {
    console.warn(
      `  - ⚠️ Could not commit/push: ${error.message}. This might be okay if there were no changes.`,
    );
  } finally {
    process.chdir(originalCwd);
  }
}
