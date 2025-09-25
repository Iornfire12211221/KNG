#!/usr/bin/env node
'use strict';

console.log('🧪 Testing AJV fix...');

try {
  // Run the fix
  require('./scripts/fix-dependencies.js');
  
  // Test the fix
  const ajvCodegen = require('./node_modules/ajv/dist/compile/codegen.js');
  
  if (ajvCodegen && ajvCodegen.CodeGen) {
    console.log('✅ AJV fix test PASSED - CodeGen class found');
    console.log('📦 Available exports:', Object.keys(ajvCodegen));
    
    // Test creating an instance
    const codeGen = new ajvCodegen.CodeGen();
    console.log('✅ CodeGen instance created successfully');
    
    process.exit(0);
  } else {
    throw new Error('CodeGen class not found in ajv codegen module');
  }
} catch (error) {
  console.error('❌ AJV fix test FAILED:', error.message);
  process.exit(1);
}