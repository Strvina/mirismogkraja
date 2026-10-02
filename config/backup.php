<?php

/*
| Nightly database backups (see App\Console\Commands\BackupDatabase).
|
| A copy on the same server only covers mistakes, not a lost server: point
| BACKUP_DISK at storage somewhere else (an "s3" disk, any S3-compatible
| bucket) as soon as there is one.
*/

return [

    // A disk from config/filesystems.php. "local" is storage/app/private.
    'disk' => env('BACKUP_DISK', 'local'),

    // Older files are deleted after each run; the newest is always kept.
    'keep_days' => (int) env('BACKUP_KEEP_DAYS', 14),

    // Full path when mysqldump isn't on the PATH (e.g. C:/xampp/mysql/bin/mysqldump.exe).
    'mysqldump' => env('BACKUP_MYSQLDUMP', 'mysqldump'),

    // Who gets the command's output when a nightly run fails. Empty: only the log.
    'notify' => env('BACKUP_NOTIFY_EMAIL'),

];
