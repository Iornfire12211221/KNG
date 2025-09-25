const fs = require('fs');
const path = require('path');

console.log('[pre-export-fix] Starting pre-export fixes...');

try {
  // Fix package.json structure first
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Ensure proper structure
    const fixedPackageJson = {
      name: packageJson.name,
      main: packageJson.main,
      version: packageJson.version,
      scripts: packageJson.scripts,
      dependencies: packageJson.dependencies,
      devDependencies: {
        "@babel/core": "^7.25.2",
        "@expo/ngrok": "^4.1.0",
        "@types/react": "~19.0.10",
        "eslint": "^9.31.0",
        "eslint-config-expo": "^9.2.0",
        "typescript": "~5.8.3"
      },
      private: packageJson.private,
      resolutions: packageJson.resolutions
    };
    
    fs.writeFileSync(packageJsonPath, JSON.stringify(fixedPackageJson, null, 2));
    console.log('[pre-export-fix] Fixed package.json structure');
  }
  
  console.log('[pre-export-fix] Applying AJV fix before Expo export...');
  
  const ajvPaths = [
    'node_modules/ajv/dist/compile/codegen.js',
    'node_modules/ajv/lib/compile/codegen.js',
    'node_modules/ajv/dist/compile/index.js',
    'node_modules/ajv/lib/compile/index.js',
    'node_modules/ajv/dist/index.js',
    'node_modules/ajv/codegen.js'
  ];
  
  const codegenContent = fs.readFileSync('scripts/codegen-direct.js', 'utf8');
  const indexContent = "module.exports = require('./codegen.js');";
  const mainIndexContent = "module.exports = require('./compile/codegen.js');";
  
  // Ensure directories exist
  const dirs = [
    'node_modules/ajv/dist/compile',
    'node_modules/ajv/lib/compile',
    'node_modules/ajv/dist',
    'node_modules/ajv/lib'
  ];
  
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[pre-export-fix] Created directory: ${dir}`);
    }
  });
  
  // Apply fixes
  fs.writeFileSync('node_modules/ajv/dist/compile/codegen.js', codegenContent);
  fs.writeFileSync('node_modules/ajv/lib/compile/codegen.js', codegenContent);
  fs.writeFileSync('node_modules/ajv/dist/compile/index.js', indexContent);
  fs.writeFileSync('node_modules/ajv/lib/compile/index.js', indexContent);
  fs.writeFileSync('node_modules/ajv/dist/index.js', mainIndexContent);
  fs.writeFileSync('node_modules/ajv/codegen.js', mainIndexContent);
  
  console.log('[pre-export-fix] AJV fix applied successfully');
  
  // Test the fix
  try {
    require('./node_modules/ajv/dist/compile/codegen.js');
    console.log('[pre-export-fix] ✓ AJV codegen import test passed');
  } catch (e) {
    console.error('[pre-export-fix] ✗ AJV codegen import test failed:', e.message);
    process.exit(1);
  }
  
} catch (error) {
  console.error('[pre-export-fix] Error during pre-export fixes:', error.message);
  process.exit(1);
}