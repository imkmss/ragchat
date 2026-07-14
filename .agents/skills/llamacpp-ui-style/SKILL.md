---
name: llamacpp-ui-style
description: llama.cpp webui (tools/ui, SvelteKit + Tailwind v4 + shadcn-svelte)의 실제 디자인 토큰과 컴포넌트 규칙을 담은 스타일 가이드. 이 프로젝트 안에서 새 화면/컴포넌트를 만들거나 UI 코드를 리뷰할 때, 또는 이 프로젝트의 룩앤필을 그대로 재현한 목업/아티팩트를 만들 때 사용한다.
---

# llama.cpp WebUI Style Skill

`tools/ui`는 SvelteKit 5 + Tailwind CSS v4 + shadcn-svelte(bits-ui) 기반이다. 이 스킬은
그 프로젝트에서 실제로 쓰이는 색상/타이포/여백/컴포넌트 규칙을 요약한 것이며, 코드를
추측하지 말고 아래 값들을 그대로 사용한다.

## 언제 참고 파일을 열어야 하는가

모든 `references/*.md`는 `scripts/generate.mjs`가 llama.cpp 소스에서 직접 추출해 생성한
파일이다. **손으로 고치지 말고, 값이 바뀌면 스크립트를 다시 실행한다** (`README.md` 참고).

- 색상, 다크모드, CSS 변수 → `references/colors.md`
- 컴포넌트 variant 색인 (22개 shadcn-svelte primitive 전체) → `references/components.md`
  → 개별 컴포넌트의 전체 소스/variant는 `references/components/<name>.md` (예: `button.md`,
  `dialog.md`, `select.md`) 하나씩 참고. `components.md`는 색인일 뿐이니 세부 코드가
  필요하면 반드시 해당 컴포넌트 파일을 연다.
- 반경(radius), 폰트, 채팅 레이아웃 변수, 유틸리티 클래스 사용 빈도 → `references/tokens.md`
- 아이콘 인벤토리 (`@lucide/svelte` 실사용 목록) → `references/icons.md`
- 사이드바 내비게이션 셸 구조/애니메이션 → `references/sidebar.md`
- 타이포그래피 스케일 (헤딩, 본문, 마크다운 렌더링) → `references/typography.md`

## 핵심 원칙 (요약)

1. **색은 항상 CSS 변수(oklch 기반 semantic token)로 참조한다.** 하드코딩된 hex/rgb를
   쓰지 않는다. 예: `bg-background`, `text-foreground`, `bg-primary`, `border-border/30`.
   실제 값은 `references/colors.md` 참고.
2. **컴포넌트는 `tailwind-variants`(`tv`)로 variant/size를 정의**하고, 클래스 병합은
   반드시 `cn()` (`clsx` + `tailwind-merge`, `$lib/components/ui/utils`)을 통해 한다.
3. **테두리·패널은 옅은 반투명 보더 + `backdrop-blur`를 쓰는 "glass" 톤**이 기본이다.
   (`border-border/30`, `dark:border-border/20`, `backdrop-blur-sm`/`backdrop-blur-lg!`).
   진한 실선 보더나 불투명 카드 배경을 새로 만들지 않는다.
4. **모서리 반경은 `--radius: 0.625rem` 기준의 스케일**(`rounded-sm/md/lg/xl`)을 쓰고,
   임의의 px 값을 넣지 않는다.
5. **아이콘은 `@lucide/svelte`만 사용**한다. 다른 아이콘 세트를 섞지 않는다.
6. **폰트는 시스템 sans 기본값 + 코드/kbd/pre 전용 `--font-mono`** 스택만 있다. 별도
   웹폰트를 로드하지 않는다.
7. 새 컴포넌트를 만들 때는 `src/lib/components/ui/`의 기존 shadcn-svelte 컴포넌트
   (`button`, `badge`, `card`, `input`, `dialog`, `alert` 등)를 최우선으로 재사용하고,
   없는 경우에만 같은 패턴(variant 정의 + `data-slot` 속성 + `cn()`)으로 새로 만든다.

## 빠른 재현 체크리스트 (LLM 친화 화면 생성용)

새 화면/목업을 만들 때 아래 순서로 적용하면 이 프로젝트 톤을 바로 재현할 수 있다.

1. 배경 `bg-background text-foreground`, 다크모드는 `.dark` 클래스 토글로 전환.
2. 카드/패널은 `rounded-xl bg-card border border-border/30 shadow-sm` (+ 필요시
   `backdrop-blur-lg!`).
3. 버튼은 `references/components/button.md`의 variant 클래스를 그대로 복사해서 쓴다.
4. 입력창은 `bg-muted/60 dark:bg-muted/75` + 옅은 보더(`BOX_BORDER`) 패턴을 따른다.
5. 강조색이 필요하면 `primary`가 아니라 톤 낮은 `secondary`/`accent`/`muted`를 먼저
   고려한다 (이 프로젝트는 채도 0의 무채색 팔레트가 기본, `chart-*` 변수만 유채색).
