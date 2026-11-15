export const copyText = async (text) => {
  const value = String(text ?? '').trim();
  if (!value) throw new Error('没有可复制的内容');

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // 部分浏览器会暴露 Clipboard API，但因权限限制拒绝调用，继续尝试兼容方案。
    }
  }

  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  textarea.style.pointerEvents = 'none';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand('copy')) throw new Error('复制失败');
  } finally {
    textarea.remove();
  }
};
