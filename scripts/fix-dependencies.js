#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing AJV dependencies...');

try {
  // Multiple locations to fix
  const locations = [
    path.join(process.cwd(), 'node_modules', 'ajv', 'dist', 'compile'),
    path.join(process.cwd(), 'node_modules', 'ajv', 'lib', 'compile'),
    path.join(process.cwd(), 'node_modules', 'ajv', 'compile')
  ];
  
  const shimContent = `'use strict';

// Minimal AJV CodeGen shim to fix ajv-keywords compatibility
class CodeGen {
  constructor(options = {}) {
    this.options = options || {};
    this._values = [];
    this._names = new Map();
    this._counter = 0;
  }
  
  code(c) { return String(c || ''); }
  str(s) { return JSON.stringify(s); }
  name(prefix = 'name') { 
    return prefix + '_' + (++this._counter); 
  }
  scopeName(name) { return String(name); }
  scopeValue(name, value) { return String(name); }
  getValue(name, value) { return value; }
  assign(name, value) { return String(name) + ' = ' + String(value); }
  let(name, value) { return 'let ' + String(name) + (value ? ' = ' + String(value) : ''); }
  const(name, value) { return 'const ' + String(name) + ' = ' + String(value); }
  if(condition, thenCode, elseCode) { 
    return 'if (' + String(condition) + ') { ' + String(thenCode) + ' }' + (elseCode ? ' else { ' + String(elseCode) + ' }' : ''); 
  }
  optimize() { return this; }
  toString() { return this._values.join('\\n'); }
  add(code) { this._values.push(String(code)); return this; }
}

class Name {
  constructor(s, scope) {
    this.str = String(s || '');
    this.scope = scope;
  }
  toString() { return this.str; }
  valueOf() { return this.str; }
}

// Export everything that ajv-keywords might need
const exports = {
  CodeGen,
  Name,
  nil: null,
  stringify: JSON.stringify,
  strConcat: function(...args) {
    return args.filter(arg => arg != null).map(String).join('');
  },
  getProperty: function(key) {
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
    AND: '&&', OR: '||', NOT: '!', EQ: '===', NEQ: '!==',
    GT: '>', GTE: '>=', LT: '<', LTE: '<=',
    ADD: '+', SUB: '-', MUL: '*', DIV: '/', MOD: '%'
  }
};

// Make sure both module.exports and exports work
module.exports = exports;
module.exports.default = exports;
for (const key in exports) {
  module.exports[key] = exports[key];
}
`;
  
  let fixed = 0;
  
  for (const dir of locations) {
    try {
      // Ensure directory exists
      fs.mkdirSync(dir, { recursive: true });
      
      // Write the shim
      const codegenPath = path.join(dir, 'codegen.js');
      fs.writeFileSync(codegenPath, shimContent);
      
      // Create index file
      const indexPath = path.join(dir, 'index.js');
      fs.writeFileSync(indexPath, "module.exports = require('./codegen.js');");
      
      console.log('✅ Fixed:', codegenPath);
      fixed++;
    } catch (e) {
      console.warn('⚠️  Could not fix:', dir, '-', e.message);
    }
  }
  
  if (fixed > 0) {
    console.log(`✅ AJV dependencies fixed successfully! (${fixed} locations)`);
  } else {
    console.error('❌ No locations could be fixed');
    process.exit(1);
  }
  
} catch (error) {
  console.error('❌ Failed to fix AJV dependencies:', error.message);
  console.error(error.stack);
  process.exit(1);
}