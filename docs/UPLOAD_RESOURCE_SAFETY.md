# Upload and conversion resource limits

- Management APIs require a JWT with `role: admin`; ordinary accounts can browse public content.
- Material pagination accepts positive integers. Invalid values use defaults; a page contains at most 100 items.
- Material uploads stream to temporary disk files, with at most 20 files per request. Temporary files are removed after responses and upload errors.
- `MAX_FILE_SIZE` supports byte counts or values such as `50MB`.
- `MAX_BATCH_UPLOAD_BYTES`: total file bytes per material upload request; default 209715200 (200 MiB), enforced for chunked requests too.
- `MAX_CONCURRENT_UPLOADS`: simultaneous material upload requests per backend process; default 2.
- `MAX_PENDING_CONVERSIONS`: queued and running MOV tasks; default 100.
- MOV tasks run serially with one encoder thread and a 15-minute timeout.

## Persistence and recovery

Migration `005_conversion_source.sql` runs on the next backend startup. It adds a nullable column without replacing existing material rows.
MOV sources persist in `backend/database/conversion-sources`, alongside the SQLite database. Preserve this directory when deploying and backing up.
The worker resumes converting rows at startup. Legacy tasks without a saved source become failed and require re-uploading.
Source and intermediate files are cleaned after completion or failure. Startup also cleans orphaned worker files.
The queue and admission limits assume one backend process (the current deployment pattern); multiple workers sharing the same database need a database-backed claim/lease before scaling out.

## Verification

Run `npm test` in `backend`. Tests use in-memory SQLite and isolated temporary directories. OSS is mocked; a local FFmpeg executable is required for the actual MOV-to-MP4 smoke test.
