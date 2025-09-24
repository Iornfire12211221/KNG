const fs = require('fs');
const path = require('path');

try {
  console.log('[fix-dependencies] Starting dependency fixes...');
  
  // Fix package-lock.json by removing problematic entries
  const packageLockPath = path.join(process.cwd(), 'package-lock.json');
  if (fs.existsSync(packageLockPath)) {
    console.log('[fix-dependencies] Removing package-lock.json to force fresh install');
    fs.unlinkSync(packageLockPath);
  }
  
  // Remove node_modules to ensure clean install
  const nodeModulesPath = path.join(process.cwd(), 'node_modules');
  if (fs.existsSync(nodeModulesPath)) {
    console.log('[fix-dependencies] Removing node_modules for clean install');
    fs.rmSync(nodeModulesPath, { recursive: true, force: true });
  }
  
  console.log('[fix-dependencies] Dependency cleanup completed');
} catch (e) {
  console.error('[fix-dependencies] Error during cleanup:', e);
}