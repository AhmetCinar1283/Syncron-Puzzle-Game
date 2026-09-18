const { spawn } = require('child_process');
const http = require('http');

console.log('Starting Next.js dev server...');

const nextProcess = spawn('npx', ['next', 'dev'], {
  stdio: 'inherit',
  shell: true,
});

let electronProcess = null;
let isElectronLaunched = false;

function checkDevServer() {
  if (isElectronLaunched) return;

  http
    .get('http://localhost:3000', (res) => {
      if (
        (res.statusCode >= 200 && res.statusCode < 400) ||
        res.statusCode === 404
      ) {
        isElectronLaunched = true;
        console.log('\n✅ Next.js dev server is ready! Launching Electron...\n');

        electronProcess = spawn('npx', ['electron', '.', '--dev'], {
          stdio: 'inherit',
          shell: true,
        });

        electronProcess.on('close', () => {
          console.log('\nElectron window closed. Stopping Next.js dev server...');
          nextProcess.kill();
          process.exit(0);
        });
      } else {
        setTimeout(checkDevServer, 1000);
      }
    })
    .on('error', () => {
      setTimeout(checkDevServer, 1000);
    });
}

// Start checking after 2 seconds
setTimeout(checkDevServer, 2000);

process.on('SIGINT', () => {
  if (nextProcess) nextProcess.kill();
  if (electronProcess) electronProcess.kill();
  process.exit(0);
});
