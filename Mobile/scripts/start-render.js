// `npm run start:render` — runs `expo start` with the app pointed at the
// deployed Render backend instead of a local server on port 3001.
// Extra args are passed through, e.g. `npm run start:render -- --tunnel`.
const { spawn } = require('child_process');

const env = {
  ...process.env,
  EXPO_PUBLIC_API_URL:
    process.env.EXPO_PUBLIC_API_URL || 'https://wrap-n-track-server.onrender.com/api',
};

console.log(`Using API: ${env.EXPO_PUBLIC_API_URL}`);

// -c clears Metro's cache so the inlined EXPO_PUBLIC_API_URL is picked up.
const child = spawn('npx', ['expo', 'start', '-c', ...process.argv.slice(2)], {
  stdio: 'inherit',
  shell: true,
  env,
});
child.on('exit', (code) => process.exit(code ?? 0));
