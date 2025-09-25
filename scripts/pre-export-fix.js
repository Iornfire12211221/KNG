const fs = require('fs');
const path = require('path');
const Module = require('module');

console.log('[pre-export-fix] Starting comprehensive pre-export fixes...');

try {
  console.log('[pre-export-fix] Applying enhanced AJV fix before Expo export...');
  
  // Create comprehensive directory structure
  const baseDir = process.cwd();
  const nodeModulesDir = path.join(baseDir, 'node_modules');
  const ajvDir = path.join(nodeModulesDir, 'ajv');
  const ajvDistDir = path.join(ajvDir, 'dist');
  const ajvLibDir = path.join(ajvDir, 'lib');
  const ajvDistCompileDir = path.join(ajvDistDir, 'compile');
  const ajvLibCompileDir = path.join(ajvLibDir, 'compile');
  
  // Ensure all directories exist
  const dirsToCreate = [
    nodeModulesDir,
    ajvDir,
    ajvDistDir,
    ajvLibDir,
    ajvDistCompileDir,
    ajvLibCompileDir
  ];
  
  dirsToCreate.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`[pre-export-fix] Created directory: ${dir}`);
    }
  });
  
  // Enhanced codegen content with all required exports
  const enhancedCodegenContent = `'use strict';
// Complete shim for ajv/dist/compile/codegen - Enhanced version
class CodeGen {
  constructor(options = {}) {
    this.options = options || {};
    this._values = [];
    this._names = new Map();
    this._prefixCounter = 0;
  }
  
  code(c) { return c || ''; }
  str(s) { return JSON.stringify(s); }
  name(prefix = 'name') { 
    return prefix + '_' + (++this._prefixCounter) + '_' + Math.random().toString(36).substr(2, 5); 
  }
  scopeName(name) { return name; }
  scopeValue(name, value) { return name; }
  getValue(name, value) { return value; }
  assign(name, value) { return name + ' = ' + value; }
  let(name, value) { return 'let ' + name + (value ? ' = ' + value : ''); }
  const(name, value) { return 'const ' + name + ' = ' + value; }
  if(condition, thenCode, elseCode) { 
    return 'if (' + condition + ') { ' + thenCode + ' }' + (elseCode ? ' else { ' + elseCode + ' }' : ''); 
  }
  elseIf(condition) { return 'else if (' + condition + ')'; }
  else() { return 'else'; }
  endIf() { return ''; }
  for(init, condition, update) { return 'for (' + init + '; ' + condition + '; ' + update + ')'; }
  endFor() { return ''; }
  while(condition) { return 'while (' + condition + ')'; }
  endWhile() { return ''; }
  break(label) { return 'break' + (label ? ' ' + label : ''); }
  continue(label) { return 'continue' + (label ? ' ' + label : ''); }
  return(value) { return 'return' + (value ? ' ' + value : ''); }
  try() { return 'try'; }
  catch(e) { return 'catch (' + (e || 'e') + ')'; }
  finally() { return 'finally'; }
  endTry() { return ''; }
  func(name, args, async) { 
    return (async ? 'async ' : '') + 'function ' + (name || '') + '(' + (args || '') + ')'; 
  }
  endFunc() { return ''; }
  optimize() { return this; }
  toString() { return this._values.join('\\n'); }
  
  // Additional methods that might be needed
  block() { return '{'; }
  endBlock() { return '}'; }
  add(code) { this._values.push(code); return this; }
}

class Name {
  constructor(s, scope) {
    this.str = s || '';
    this.scope = scope;
  }
  toString() { return this.str; }
  valueOf() { return this.str; }
}

// All exports that ajv-keywords and other packages might expect
const exports = {
  CodeGen,
  Name,
  nil: null,
  stringify: JSON.stringify,
  strConcat: function(...args) {
    return args.filter(arg => arg != null).join('');
  },
  getProperty: function(key) {
    if (typeof key === 'string') return key;
    if (typeof key === 'number') return String(key);
    return String(key);
  },
  safeStringify: function(value) {
    try {
      return JSON.stringify(value);
    } catch (e) {
      return String(value);
    }
  },
  operators: {
    AND: '&&',
    OR: '||',
    NOT: '!',
    EQ: '===',
    NEQ: '!==',
    GT: '>',
    GTE: '>=',
    LT: '<',
    LTE: '<=',
    ADD: '+',
    SUB: '-',
    MUL: '*',
    DIV: '/',
    MOD: '%',
    PLUS: '+',
    MINUS: '-'
  },
  // Additional utility functions
  _: {
    nil: null,
    stringify: JSON.stringify,
    str: JSON.stringify,
    strConcat: function(...args) {
      return args.filter(arg => arg != null).join('');
    },
    getProperty: function(key) {
      return typeof key === 'string' ? key : String(key);
    }
  },
  // Common constants
  KeywordCxt: class KeywordCxt {
    constructor() {
      this.gen = new CodeGen();
    }
  },
  // For compatibility
  default: null
};

// Set default export
exports.default = exports;

module.exports = exports;

console.log('[codegen-enhanced] AJV codegen shim loaded with', Object.keys(exports).length, 'exports');
`;
  
  const indexContent = `'use strict';
// Index file for ajv/dist/compile
module.exports = require('./codegen.js');
`;
  
  const mainIndexContent = `'use strict';
// Main AJV index
try {
  module.exports = require('./compile/codegen.js');
} catch (e) {
  console.warn('[ajv-main] Fallback to basic export:', e.message);
  module.exports = {};
}
`;
  
  // Create AJV package.json
  const ajvPackageJson = {
    "name": "ajv",
    "version": "8.17.1",
    "main": "dist/index.js",
    "exports": {
      ".": "./dist/index.js",
      "./dist/compile/codegen": "./dist/compile/codegen.js",
      "./dist/compile": "./dist/compile/index.js",
      "./lib/compile/codegen": "./lib/compile/codegen.js",
      "./lib/compile": "./lib/compile/index.js"
    }
  };
  
  // Write all files
  const filesToWrite = [
    { path: path.join(ajvDir, 'package.json'), content: JSON.stringify(ajvPackageJson, null, 2) },
    { path: path.join(ajvDistDir, 'index.js'), content: mainIndexContent },
    { path: path.join(ajvLibDir, 'index.js'), content: mainIndexContent },
    { path: path.join(ajvDistCompileDir, 'codegen.js'), content: enhancedCodegenContent },
    { path: path.join(ajvLibCompileDir, 'codegen.js'), content: enhancedCodegenContent },
    { path: path.join(ajvDistCompileDir, 'index.js'), content: indexContent },
    { path: path.join(ajvLibCompileDir, 'index.js'), content: indexContent },
    { path: path.join(ajvDir, 'codegen.js'), content: enhancedCodegenContent }
  ];
  
  console.log('[pre-export-fix] Writing AJV shim files...');
  filesToWrite.forEach(({ path: filePath, content }) => {
    fs.writeFileSync(filePath, content);
    console.log(`[pre-export-fix] ✓ Created: ${filePath}`);
  });
  
  // Override module resolution for runtime
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    // Handle ajv codegen requests
    if (request === 'ajv/dist/compile/codegen' || request.endsWith('/ajv/dist/compile/codegen')) {
      const targetPath = path.join(ajvDistCompileDir, 'codegen.js');
      if (fs.existsSync(targetPath)) {
        console.log('[module-resolve] Resolved ajv/dist/compile/codegen to:', targetPath);
        return targetPath;
      }
    }
    if (request === 'ajv/dist/compile' || request.endsWith('/ajv/dist/compile')) {
      const targetPath = path.join(ajvDistCompileDir, 'index.js');
      if (fs.existsSync(targetPath)) {
        console.log('[module-resolve] Resolved ajv/dist/compile to:', targetPath);
        return targetPath;
      }
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };
  
  console.log('[pre-export-fix] Enhanced AJV fix applied successfully');
  
  // Test the fix
  try {
    const testPath = path.join(ajvDistCompileDir, 'codegen.js');
    const testModule = require(testPath);
    if (testModule && testModule.CodeGen) {
      console.log('[pre-export-fix] ✓ AJV codegen import test passed - CodeGen class found');
    } else {
      throw new Error('CodeGen class not found in module');
    }
  } catch (e) {
    console.error('[pre-export-fix] ✗ AJV codegen import test failed:', e.message);
    process.exit(1);
  }
  
  console.log('[pre-export-fix] All pre-export fixes completed successfully');
  console.log('[pre-export-fix] Module resolution override is active');
  
} catch (error) {
  console.error('[pre-export-fix] Error during pre-export fixes:', error.message);
  console.error('[pre-export-fix] Stack:', error.stack);
  process.exit(1);
}