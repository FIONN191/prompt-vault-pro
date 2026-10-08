const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')
// Catch main-process syntax errors before opening or packaging Electron.
for (const name of fs.readdirSync(path.join(__dirname, '..', 'electron')).filter(name => name.endsWith('.cjs'))) {
 execFileSync(process.execPath, ['--check', path.join(__dirname, '..', 'electron', name)], { stdio: 'inherit' })
}
if (process.platform === 'darwin') {
 const dir = path.join(__dirname, '..', 'electron', 'native')
 const tmp = path.join(dir, '.build')
 fs.mkdirSync(tmp, { recursive: true })
 for (const arch of ['arm64', 'x86_64']) execFileSync('swiftc', ['-O', '-target', `${arch}-apple-macos11.0`, path.join(dir, 'prompt-insert.swift'), '-o', path.join(tmp, arch)], { stdio: 'inherit' })
 execFileSync('lipo', ['-create', path.join(tmp, 'arm64'), path.join(tmp, 'x86_64'), '-output', path.join(dir, 'prompt-insert-mac')], { stdio: 'inherit' })
 fs.rmSync(tmp, { recursive: true, force: true })
}
