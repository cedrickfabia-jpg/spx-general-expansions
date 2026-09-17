# Firestore Restore Guide

Backups are stored on the `backups` branch of this repository.

To restore:

1. Open GitHub Actions.
2. Run the **Firestore Restore** workflow.
3. Enter the backup file path, for example `backups/firestore-backup-2026-09-17.json`.
4. Run the workflow.

The restore will merge the backup back into Firestore.

Important: Restore overwrites matching document IDs and should only be run intentionally, preferably outside normal working hours.
