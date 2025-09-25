const fs = require('fs');
const path = require('path');

console.log('[pre-export-fix] Applying AJV fix before Expo export...');

try {
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
  console.error('[pre-export-fix] Error applying AJV fix:', error.message);
  process.exit(1);
}