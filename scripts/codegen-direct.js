'use strict';
// Direct replacement for ajv/dist/compile/codegen
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
  toString() { return this._values.join('\n'); }
}

class Name {
  constructor(s, scope) {
    this.str = s;
    this.scope = scope;
  }
  toString() { return this.str; }
}

// Export all the functions and classes that ajv-keywords expects
module.exports = {
  CodeGen,
  Name,
  nil: null,
  stringify: JSON.stringify,
  strConcat: function(...args) {
    return args.filter(Boolean).join('');
  },
  getProperty: function(key) {
    return typeof key === 'string' ? key : String(key);
  },
  safeStringify: function(value) {
    return JSON.stringify(value);
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
    MOD: '%'
  },
  // Additional exports that might be needed
  _: {
    nil: null,
    stringify: JSON.stringify,
    str: JSON.stringify,
    strConcat: function(...args) {
      return args.filter(Boolean).join('');
    }
  }
};

// Also export as default for ES6 compatibility
module.exports.default = module.exports;

console.log('[codegen-direct] AJV codegen shim loaded successfully');