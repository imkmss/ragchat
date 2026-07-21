import { useEffect, useState } from 'react';
import { Cpu, Check } from 'lucide-react';
import { getModels } from '../lib/api';
import { copyToClipboard } from '../lib/clipboard';

export default function ModelBadge() {
  const [models, setModels] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getModels().then(setModels);
  }, []);

  if (!models) return null;

  const handleCopy = async () => {
    try {
      await copyToClipboard(`임베딩: ${models.embedding} / 생성: ${models.generation}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // 클립보드 접근 실패 시 조용히 무시
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="클릭해서 복사"
      className="relative flex items-center gap-1.5 rounded-full border border-border/30 bg-muted/60 px-3 py-1 text-xs text-muted-foreground hover:bg-muted transition-colors"
    >
      {copied ? <Check size={12} /> : <Cpu size={12} />}
      <span>임베딩 {models.embedding}</span>
      <span className="opacity-40">·</span>
      <span>생성 {models.generation}</span>

      {copied && (
        <span className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background">
          복사 완료!
        </span>
      )}
    </button>
  );
}
