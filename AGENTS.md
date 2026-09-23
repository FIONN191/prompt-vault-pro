# Prompt Vault Pro project rules

## Sync every update to GitHub

The user requires every completed, verified update to this app to be synchronized to their GitHub repository without a separate reminder.

- Commit the changes relevant to the update and push to the confirmed project remote after verification.
- Preserve unrelated user changes. Do not commit secrets, personal prompt-library data, node_modules, or generated build outputs.
- Report the actual push result. Local edits, local commits, and generated installers alone do not mean GitHub has been updated.
- Continue following the workspace's installer packaging rules. Use the repository's confirmed release convention for installer uploads, if one exists.
- The user approved a public repository on 2026-09-24: https://github.com/FIONN191/prompt-vault-pro. Use this project's `origin` remote and `main` branch. Verify the remote before every push; do not force-push or overwrite remote changes.
