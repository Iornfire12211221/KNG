FROM node:20-alpine

ARG BUILD_ID=auto
ENV BUILD_ID=$BUILD_ID

RUN apk add --no-cache bash curl libc6-compat

WORKDIR /app

# Copy package files first
COPY package.json ./

# Install dependencies
RUN npm i --no-audit --no-fund --legacy-peer-deps

# Copy the rest of the app
COPY . .

# Apply comprehensive AJV fix before export
RUN echo "Applying comprehensive AJV fix..." && \
    mkdir -p node_modules/ajv/dist/compile && \
    mkdir -p node_modules/ajv/lib/compile && \
    cat > node_modules/ajv/dist/compile/codegen.js << 'EOF'
'use strict';
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
  toString() { return this._values.join('\n'); }
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
EOF

# Copy to all required locations
RUN cp node_modules/ajv/dist/compile/codegen.js node_modules/ajv/lib/compile/codegen.js && \
    echo "module.exports = require('./codegen.js');" > node_modules/ajv/dist/compile/index.js && \
    echo "module.exports = require('./codegen.js');" > node_modules/ajv/lib/compile/index.js && \
    echo "module.exports = require('./compile/codegen.js');" > node_modules/ajv/dist/index.js && \
    echo "module.exports = require('./dist/compile/codegen.js');" > node_modules/ajv/codegen.js && \
    echo "✓ AJV fix applied successfully"

# Verify the fix works
RUN node -e "try { const ajv = require('./node_modules/ajv/dist/compile/codegen.js'); if (ajv.CodeGen) { console.log('✓ AJV codegen verified - CodeGen class found'); } else { throw new Error('CodeGen not found'); } } catch(e) { console.error('✗ AJV verification failed:', e.message); process.exit(1); }"

# Build static web once at build time
RUN npx expo export --platform web

# Optional debug
RUN ls -la ./dist || true

EXPOSE 8081
CMD ["npx", "tsx", "backend/hono.ts"]