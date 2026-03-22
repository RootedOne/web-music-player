# Update Migration Guide

Because this update introduces case-insensitive logins (by converting all usernames to lowercase in the code), you need to migrate any existing mixed-case usernames in your database so that those users can still log in.

### 1. Migrate Database Usernames
We have created a script to safely update all existing usernames in your SQLite database to lowercase.

Run this command from the root of your project:
```bash
node scripts/migrate-usernames.mjs
```

### 2. Migrating Uploaded Music & Database
Since you are updating the application, you likely want to keep all the uploaded tracks and playlists.

To migrate to the new update **without losing data**, you just need to keep two things from your current installation:

1. **Your Database File**: Keep `prisma/dev.db` (this is the SQLite database containing all user accounts, track metadata, and playlists).
2. **Your Audio Files**: Keep the `public/uploads/` directory (this is where all the physical `.mp3`, `.wav`, and cover art files are stored).

If you are just `git pull`ing the latest changes into your existing folder, you **do not need to do anything** else! The files will stay exactly where they are.

If you are moving to a completely new folder/server, simply copy the `prisma/dev.db` file and the `public/uploads` folder into your new project directory before starting it.
