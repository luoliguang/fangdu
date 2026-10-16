const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// 优先用 npm 安装的 ffmpeg-static，没有就回退到系统 PATH 里的 ffmpeg
let FFMPEG_BIN = 'ffmpeg';
try { FFMPEG_BIN = require('ffmpeg-static'); } catch (_) {}

/**
 * 把视频 buffer（如 MOV）转为 MP4 buffer
 * 依赖服务器已安装 ffmpeg（apt install ffmpeg）
 */
async function convertToMp4(inputBuffer) {
  const tmpDir = os.tmpdir();
  const ts = Date.now();
  const inputPath = path.join(tmpDir, `fangdu_${ts}_in.mov`);
  const outputPath = path.join(tmpDir, `fangdu_${ts}_out.mp4`);

  fs.writeFileSync(inputPath, inputBuffer);

  try {
    await runFfmpeg(inputPath, outputPath);
    return fs.readFileSync(outputPath);
  } finally {
    try { fs.unlinkSync(inputPath); } catch (_) {}
    try { fs.unlinkSync(outputPath); } catch (_) {}
  }
}

function runFfmpeg(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG_BIN, [
      '-i', inputPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-movflags', '+faststart', // moov atom 前置，让浏览器边下载边播
      '-y',
      outputPath
    ]);

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg 退出码 ${code}: ${stderr.slice(-500)}`));
    });

    proc.on('error', err => {
      reject(new Error(`ffmpeg 启动失败（是否已安装？）: ${err.message}`));
    });
  });
}

module.exports = { convertToMp4 };
