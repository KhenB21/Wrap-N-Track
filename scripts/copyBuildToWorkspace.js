const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'Website', 'client', 'build');
const dest = path.join(__dirname, '..', 'build');

async function copyRecursive(srcDir, destDir) {
  await fs.promises.mkdir(destDir, { recursive: true });
  const entries = await fs.promises.readdir(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    if (entry.isDirectory()) {
      await copyRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      await fs.promises.copyFile(srcPath, destPath);
    }
  }
}

async function run() {
  try {
    const srcExists = fs.existsSync(src);
    if (!srcExists) {
      console.error('Source build directory not found:', src);
      process.exit(1);
    }
    // Remove existing dest if present to avoid stale files
    if (fs.existsSync(dest)) {
      await fs.promises.rm(dest, { recursive: true, force: true });
    }
    await copyRecursive(src, dest);
    console.log('Copied build to workspace root:', dest);
    process.exit(0);
  } catch (err) {
    console.error('Error copying build to workspace:', err);
    process.exit(1);
  }
}

run();
