const Module = require('module');
const path = require('path');
const fs = require('fs');

try {
  const shimDir = path.join(process.cwd(), 'node_modules', '.shim-ajv');
  const shimPath = path.join(shimDir, 'codegen.js');
  fs.mkdirSync(shimDir, { recursive: true });
  if (!fs.existsSync(shimPath)) {
    fs.writeFileSync(
      shimPath,
      "'use strict';\n// Minimal shim for ajv/dist/compile/codegen expected by ajv-keywords in some bundlers\nmodule.exports = {};\n"
    );
  }
  const originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, parent, isMain, options) {
    if (request === 'ajv/dist/compile/codegen') {
      return shimPath;
    }
    return originalResolve.call(this, request, parent, isMain, options);
  };
  // Debug
  console.log('[ajv-codegen-shim] active, shim at', shimPath);
} catch (e) {
  console.error('[ajv-codegen-shim] failed to initialize', e);
}
