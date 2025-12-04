#!/usr/bin/env node

/**
 * Post-checkout script to handle branch switching
 * Run this script after switching branches to ensure dependencies are correct
 * Usage: npm run postcheckout
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function checkPackageChanges() {
  try {
    // Check if package.json or package-lock.json changed
    const result = execSync('git diff --name-only HEAD@{1} HEAD', { encoding: 'utf-8' });
    const changedFiles = result.trim().split('\n').filter(Boolean);
    
    const hasPackageChanges = changedFiles.some(file => 
      file === 'package.json' || file === 'package-lock.json'
    );
    
    if (hasPackageChanges) {
      console.log('⚠️  Detected changes in package.json or package-lock.json');
      console.log('📦 Reinstalling dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencies reinstalled successfully!');
    } else {
      console.log('ℹ️  No dependency changes detected. Skipping npm install.');
    }
  } catch (error) {
    console.error('❌ Error checking for package changes:', error.message);
    console.log('💡 Tip: Run "npm install" manually if you encounter issues.');
  }
}

// Check if we're in a git repository
const gitDir = path.join(process.cwd(), '.git');
if (!fs.existsSync(gitDir)) {
  console.log('ℹ️  Not a git repository. Skipping post-checkout check.');
  process.exit(0);
}

checkPackageChanges();

