#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing AJV dependencies...');

try {
  // Create the ajv codegen shim
  const ajvDir = path.join(process.cwd(), 'node_modules', 'ajv', 'dist', 'compile');
  const codegenPath = path.join(ajvDir, 'codegen.js');
  
  // Ensure directory exists
  fs.mkdirSync(ajvDir, { recursive: true });
  
  const shimContent = `'use strict';

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
    AND: '&&', OR: '||', NOT: '!', EQ: '===', NEQ: '!==',
    GT: '>', GTE: '>=', LT: '<', LTE: '<=',
    ADD: '+', SUB: '-', MUL: '*', DIV: '/', MOD: '%',
    PLUS: '+', MINUS: '-'
  },
  _: {
    nil: null, stringify: JSON.stringify, str: JSON.stringify,
    strConcat: function(...args) { return args.filter(arg => arg != null).join(''); },
    getProperty: function(key) { return typeof key === 'string' ? key : String(key); }
  },
  KeywordCxt: class KeywordCxt { constructor() { this.gen = new CodeGen(); } },
  default: null
};

exports.default = exports;
module.exports = exports;
`;
  
  // Write the shim
  fs.writeFileSync(codegenPath, shimContent);
  
  // Create index files
  const indexContent = "module.exports = require('./codegen.js');";
  fs.writeFileSync(path.join(ajvDir, 'index.js'), indexContent);
  
  // Also create lib version
  const libDir = path.join(process.cwd(), 'node_modules', 'ajv', 'lib', 'compile');
  fs.mkdirSync(libDir, { recursive: true });
  fs.writeFileSync(path.join(libDir, 'codegen.js'), shimContent);
  fs.writeFileSync(path.join(libDir, 'index.js'), indexContent);
  
  console.log('✅ AJV dependencies fixed successfully!');
  console.log('📁 Created:', codegenPath);
  
} catch (error) {
  console.error('❌ Failed to fix AJV dependencies:', error.message);
  process.exit(1);
}