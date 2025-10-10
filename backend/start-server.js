// Production server startup script
const { spawn } = require('child_process');
const path = require('path');

console.log('=== STARTING FULL APPLICATION ===');
console.log('Step 1: Database setup...');

// Run Prisma db push
const prismaProcess = spawn('npx', ['prisma', 'db', 'push', '--skip-generate'], {
  stdio: 'inherit',
  shell: true
});

prismaProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Prisma db push failed with code:', code);
    process.exit(1);
  }
  
  console.log('✅ Database ready, starting Hono server...');
  
  // Start the Hono server
  const serverProcess = spawn('node', ['--loader', 'tsx/esm', 'backend/hono.ts'], {
    stdio: 'inherit',
    shell: true
  });
  
  serverProcess.on('close', (code) => {
    console.error('❌ Server process exited with code:', code);
    process.exit(code);
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
});

prismaProcess.on('error', (error) => {
  console.error('❌ Failed to run Prisma db push:', error);
  process.exit(1);
});
