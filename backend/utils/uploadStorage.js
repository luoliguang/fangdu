const fs = require('fs');
const os = require('os');
const path = require('path');
const { randomUUID } = require('crypto');
const { Transform, pipeline } = require('stream');
function createUploadStorage() {
  const maxBytes = Number(process.env.MAX_BATCH_UPLOAD_BYTES) || 200 * 1024 * 1024;
  return {
    _handleFile(req, file, cb) {
      const destination = path.join(os.tmpdir(), `fangdu-upload-${randomUUID()}`);
      req.uploadPaths ||= new Set();
      req.uploadPaths.add(destination);
      let size = 0;
      const counter = new Transform({ transform(chunk, encoding, done) {
        size += chunk.length;
        req.uploadBytes = (req.uploadBytes || 0) + chunk.length;
        if (req.uploadBytes > maxBytes) {
          const error = new Error('Batch upload exceeds size limit');
          error.status = 413;
          return done(error);
        }
        done(null, chunk);
      }});
      const abort = () => file.stream.destroy(new Error('Upload aborted'));
      req.once('aborted', abort);
      pipeline(file.stream, counter, fs.createWriteStream(destination), error => {
        req.removeListener('aborted', abort);
        if (error) fs.unlink(destination, () => cb(error));
        else cb(null, { path: destination, size });
      });
    },
    _removeFile(req, file, cb) { fs.unlink(file.path, error => cb(error?.code === 'ENOENT' ? null : error)); }
  };
}
let activeUploads = 0;
function uploadAdmission(req, res, next) {
  if (activeUploads >= (Number(process.env.MAX_CONCURRENT_UPLOADS) || 2))
    return res.status(503).json({ success: false, message: 'Uploads busy, retry later' });
  activeUploads++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeUploads--;
    for (const file of req.uploadPaths || []) fs.unlink(file, () => {});
  };
  res.once('finish', release);
  res.once('close', release);
  next();
}
module.exports = { createUploadStorage, uploadAdmission };
