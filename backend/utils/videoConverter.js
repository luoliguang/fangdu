const { spawn } = require('child_process');
let binary = 'ffmpeg';
try {
  const bundled = require('ffmpeg-static');
  if (bundled && require('fs').existsSync(bundled)) binary = bundled;
} catch (_) {}
const active = new Set();
process.once('exit', () => { for (const proc of active) proc.kill('SIGKILL'); });
// Disk paths avoid buffering source and encoded video in Node memory.
function convertToMp4(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(binary, ['-nostdin', '-i', inputPath, '-threads', '1', '-c:v', 'libx264',
      '-preset', 'fast', '-crf', '23', '-c:a', 'aac', '-movflags', '+faststart', '-y', outputPath], { windowsHide: true });
    active.add(proc);
    let stderr = '';
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; proc.kill('SIGKILL'); }, 15 * 60 * 1000);
    proc.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-2000); });
    proc.once('error', error => { active.delete(proc); clearTimeout(timeout); reject(error); });
    proc.once('close', code => {
      active.delete(proc);
      clearTimeout(timeout);
      if (code === 0) resolve();
      else reject(new Error(timedOut ? 'Conversion timed out' : `ffmpeg exit ${code}: ${stderr.slice(-500)}`));
    });
  });
}
module.exports = { convertToMp4, binary };
