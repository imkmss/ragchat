// navigator.clipboard는 보안 컨텍스트(HTTPS 또는 localhost)에서만 존재해서,
// 사내망 IP로 http:// 접속하면 아예 undefined라 예외가 던져진다. 그럴 땐 임시
// textarea + execCommand('copy')로 폴백한다 (deprecated지만 이 용도로는 아직 잘 동작함).
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // 아래 폴백으로 이어짐
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  try {
    document.execCommand('copy');
  } finally {
    document.body.removeChild(textarea);
  }
}
