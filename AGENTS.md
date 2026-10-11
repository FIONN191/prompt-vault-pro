# Prompt Vault Pro project rules

## Sync every update to GitHub

The user requires every completed, verified update to this app to be synchronized to their GitHub repository without a separate reminder.

- Commit the changes relevant to the update and push to the confirmed project remote after verification.
- Preserve unrelated user changes. Do not commit secrets, personal prompt-library data, node_modules, or generated build outputs.
- Report the actual push result. Local edits, local commits, and generated installers alone do not mean GitHub has been updated.
- Continue following the workspace's installer packaging rules. Use the repository's confirmed release convention for installer uploads, if one exists.
- The user approved a public repository on 2026-09-24: https://github.com/FIONN191/prompt-vault-pro. Use this project's `origin` remote and `main` branch. Verify the remote before every push; do not force-push or overwrite remote changes.

## Automatically install every verified update

The user requested on 2026-10-12 that every update be installed automatically, not merely delivered as installer links.

- After verifying and packaging a shipped update, back up the currently installed app and its user data to the external release workspace, quit the old app safely, and install the verified new Mac build at `/Applications/PromptVaultPro.app` without asking again.
- Preserve existing prompts, settings, and login data. Relaunch and verify the installed version and the affected feature. Refresh existing accessibility authorization if the updated signature requires it; system passwords and Touch ID must be handled by the user.
- Continue generating both Mac and Windows installers and syncing source to GitHub. Only claim Windows installation if an accessible Windows machine was actually updated; building its installer is separate.
- Report installation success separately from build success. Documentation-only changes do not require repackaging or reinstalling.
