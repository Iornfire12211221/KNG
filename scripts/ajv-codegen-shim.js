const Module = require('module');
const path = require('path');
const fs = require('fs');

console.log('[ajv-codegen-shim] Starting AJV codegen shim setup...');

try {
  // Create multiple shim locations for better compatibility
  const shimDir = path.join(process.cwd(), 'node_modules', '.shim-ajv');
  const shimPath = path.join(shimDir, 'codegen.js');
  const ajvCodegenPath = path.join(process.cwd(), 'node_modules', 'ajv', 'dist', 'compile', 'codegen.js');
  const ajvIndexPath = path.join(process.cwd(), 'node_modules', 'ajv', 'dist', 'compile', 'index.js');
  const ajvCompilePath = path.join(process.cwd(), 'node_modules', 'ajv', 'dist', 'compile');
  const ajvDistPath = path.join(process.cwd(), 'node_modules', 'ajv', 'dist');
  const ajvPath = path.join(process.cwd(), 'node_modules', 'ajv');
  const codegenDirectPath = path.join(process.cwd(), 'scripts', 'codegen-direct.js');
  
  // Ensure all directories exist
  console.log('[ajv-codegen-shim] Creating directories...');
  fs.mkdirSync(ajvPath, { recursive: true });
  fs.mkdirSync(ajvDistPath, { recursive: true });
  fs.mkdirSync(ajvCompilePath, { recursive: true });
  
  // Create shim directory
  fs.mkdirSync(shimDir, { recursive: true });
  
  // Use the enhanced codegen from codegen-direct.js
  let shimContent;
  
  if (fs.existsSync(codegenDirectPath)) {
    console.log('[ajv-codegen-shim] Using enhanced codegen from codegen-direct.js');
    shimContent = fs.readFileSync(codegenDirectPath, 'utf8');
  } else {
    console.log('[ajv-codegen-shim] Using fallback shim content');
    shimContent = `'use strict';
// Enhanced shim for ajv/dist/compile/codegen expected by ajv-keywords
class CodeGen {
  constructor(options = {}) {
    this.options = options;
    this._values = [];
    this._names = new Map();
  }
  
  code(c) { return c || ''; }
  str(s) { return JSON.stringify(s); }
  name(prefix) { return prefix + '_' + Math.random().toString(36).substr(2, 9); }
  scopeName(name) { return name; }
  scopeValue(name, value) { return name; }
  getValue(name, value) { return value; }
  assign(name, value) { return name + ' = ' + value; }
  let(name, value) { return 'let ' + name + (value ? ' = ' + value : ''); }
  const(name, value) { return 'const ' + name + ' = ' + value; }
  if(condition, thenCode, elseCode) { return 'if (' + condition + ') { ' + thenCode + ' }' + (elseCode ? ' else { ' + elseCode + ' }' : ''); }
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
  func(name, args, async) { return (async ? 'async ' : '') + 'function ' + (name || '') + '(' + (args || '') + ')'; }
  endFunc() { return ''; }
  optimize() { return this; }
  toString() { return this._values.join('\\n'); }
}

class Name {
  constructor(s, scope) {
    this.str = s;
    this.scope = scope;
  }
  toString() { return this.str; }
}

module.exports = {
  CodeGen,
  Name,
  nil: null,
  stringify: JSON.stringify,
  strConcat: (...args) => args.filter(Boolean).join(''),
  getProperty: (key) => typeof key === 'string' ? key : String(key),
  safeStringify: (value) => JSON.stringify(value),
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
    MOD: '%'
  }
};
`;
  }
  
  const indexContent = `'use strict';
module.exports = require('./codegen.js');
`;
  
  // Write shim to all locations
  console.log('[ajv-codegen-shim] Writing shim files...');
  fs.writeFileSync(shimPath, shimContent);
  
  // Write the shim content to the target location
  fs.writeFileSync(ajvCodegenPath, shimContent);
  
  fs.writeFileSync(ajvIndexPath, indexContent);
  
  // Also create a main ajv index if it doesn't exist
  const ajvMainIndex = path.join(process.cwd(), 'node_modules', 'ajv', 'dist', 'index.js');
  if (!fs.existsSync(ajvMainIndex)) {
    const ajvMainContent = `'use strict';
module.exports = require('./compile/codegen.js');
`;
    fs.writeFileSync(ajvMainIndex, ajvMainContent);
  }
  
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'ajv/dist/compile/codegen' || request.endsWith('ajv/dist/compile/codegen')) {
      // Try the actual ajv path first, then fallback to shim
      if (fs.existsSync(ajvCodegenPath)) {
        return ajvCodegenPath;
      }
      return shimPath;
    }
    if (request === 'ajv/dist/compile' || request.endsWith('ajv/dist/compile')) {
      if (fs.existsSync(ajvIndexPath)) {
        return ajvIndexPath;
      }
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };
  
  // Debug
  console.log('[ajv-codegen-shim] Successfully created shims at:');
  console.log('  -', shimPath, fs.existsSync(shimPath) ? '✓' : '✗');
  console.log('  -', ajvCodegenPath, fs.existsSync(ajvCodegenPath) ? '✓' : '✗');
  console.log('  -', ajvIndexPath, fs.existsSync(ajvIndexPath) ? '✓' : '✗');
  console.log('[ajv-codegen-shim] Module resolution override active');
} catch (e) {
  console.error('[ajv-codegen-shim] Failed to initialize:', e.message);
  console.error('[ajv-codegen-shim] Stack:', e.stack);
  process.exit(1);
}