const { execFileSync } = require('node:child_process')
// No Developer ID certificate is configured. Seal the bundle with its real
// identifier so TCC attributes helper requests to PromptVaultPro, not Electron.
// This is local ad-hoc signing, not Apple notarization or distribution signing.
exports.default = async function sign({ app }) {
 execFileSync('codesign', ['--force', '--deep', '--sign', '-', '--identifier', 'com.fionn.promptvaultpro', '--preserve-metadata=entitlements', app], { stdio: 'inherit' })
 execFileSync('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app], { stdio: 'inherit' })
}
