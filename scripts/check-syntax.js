const { readdirSync, statSync } = require('fs');
const { join, relative } = require('path');
const { spawnSync } = require('child_process');

const root = join(__dirname, '..');
const ignoredDirectories = new Set(['node_modules']);

function JavaScriptFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = join(directory, entry);
    const relativePath = relative(root, absolutePath);

    if (statSync(absolutePath).isDirectory()) {
      return ignoredDirectories.has(entry) ? [] : JavaScriptFiles(absolutePath);
    }

    return entry.endsWith('.js') ? [relativePath] : [];
  });
}

for (const file of JavaScriptFiles(root)) {
  const result = spawnSync(process.execPath, ['--check', file], {
    cwd: root,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

console.log('Backend JavaScript syntax check passed.');
