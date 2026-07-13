export default function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1">
      <div className="flex items-center gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-black animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-sm text-muted-foreground">
        답변을 생성 중입니다. 잠시만 기다려주세요:)
      </span>
    </div>
  );
}
