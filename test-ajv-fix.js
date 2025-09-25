#!/usr/bin/env node
'use strict';

console.log('🧪 Testing AJV fix...');

try {
  // First run the fix
  console.log('Running fix script...');
  require('./scripts/fix-dependencies.js');
  
  console.log('Testing the fix...');
  
  // Test multiple locations
  const locations = [
    './node_modules/ajv/dist/compile/codegen.js',
    './node_modules/ajv/lib/compile/codegen.js',
    './node_modules/ajv/compile/codegen.js'
  ];
  
  let success = false;
  
  for (const location of locations) {
    try {
      console.log('Testing:', location);
      const ajvCodegen = require(location);
      
      if (ajvCodegen && ajvCodegen.CodeGen) {
        console.log('✅ Found CodeGen at:', location);
        console.log('📦 Available exports:', Object.keys(ajvCodegen));
        
        // Test creating an instance
        const codeGen = new ajvCodegen.CodeGen();
        console.log('✅ CodeGen instance created successfully');
        
        success = true;
        break;
      }
    } catch (e) {
      console.log('⚠️  Location not available:', location, '-', e.message);
    }
  }
  
  if (success) {
    console.log('✅ AJV fix test PASSED!');
    process.exit(0);
  } else {
    throw new Error('CodeGen class not found in any location');
  }
  
} catch (error) {
  console.error('❌ AJV fix test FAILED:', error.message);
  console.error(error.stack);
  process.exit(1);
}