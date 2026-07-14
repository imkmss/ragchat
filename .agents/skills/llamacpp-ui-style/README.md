# llamacpp-ui-style (portable skill package)

이 저장소(또는 폴더) 하나가 완결된 패키지다. 외부 의존성 없이(Node 내장 모듈만 사용) 그대로
복사해서 다른 프로젝트에 넣으면 바로 동작한다.

## 설치

원격 저장소:

```
https://yootwo.kro.kr:13100/zaenam/lammacpp-style-skills.git
```

### clone 없이 한 줄 설치 (저장소가 public일 때)

```bash
curl -fsSL https://yootwo.kro.kr:13100/zaenam/lammacpp-style-skills/raw/branch/main/scripts/bootstrap.mjs \
  | node - <설치할-프로젝트-경로 또는 git-리모트-URL>
```

`bootstrap.mjs` 파일 하나만 익명 HTTPS로 받아서 실행하는 방식이라 사용자가 직접 `git clone`을
타이핑할 필요가 없다 (내부적으로는 패키지 소스를 임시 디렉터리에 clone한 뒤 `install.mjs`를
실행하고 그 임시 디렉터리는 자동으로 정리한다 — clone 자체가 없는 게 아니라, 그 단계를 사용자가
직접 하지 않아도 된다는 뜻). **저장소가 비공개면 익명 raw 접근이 401로 막히므로 이 방법은
저장소를 public으로 전환한 뒤에만 동작한다** (전환 전까지는 아래 두 방법 중 하나를 쓴다).

### clone 후 설치

```bash
git clone https://yootwo.kro.kr:13100/zaenam/lammacpp-style-skills.git
cd lammacpp-style-skills
node scripts/install.mjs <설치할-프로젝트-경로 또는 git-리모트-URL>
```

`<대상>` 자리에 로컬 경로(`../my-project`)나 git 리모트 URL을 그대로 넣으면 된다.
리모트 URL이면 임시 디렉터리에 자동으로 clone한 뒤 그 안에 설치한다. **대상을 생략하면 현재
디렉터리에 설치한다** (이미 그 위치에 패키지가 있으면 자기 자신을 지우지 않고 건너뛴다).
`install.mjs`는:

1. `<대상>/.agents/skills/llamacpp-ui-style/`에 패키지 전체를 복사 — 이 시점에서
   Codex CLI / Antigravity / OpenCode / Pi coding agent는 별도 설정 없이 바로 인식한다.
2. `<대상>/.claude/skills/llamacpp-ui-style`를 위 경로로의 심볼릭 링크로 생성 — Claude Code용.
3. **기본값은 파일시스템만 건드리고 git에는 손대지 않는다.** `git add`/커밋/푸시 전부 하지
   않는다. 대상이 리모트를 클론한 임시 디렉터리인 경우, 스크립트가 마지막에 그 임시 디렉터리를
   커밋·푸시하는 방법을 안내만 하고 직접 실행하지는 않는다.

옵션: `--branch <name>` (clone할 브랜치), `--no-claude` (`.claude/skills` 생략),
`--copy-claude` (심볼릭 링크 대신 실제 파일 복사 — 심볼릭 링크를 못 쓰는 환경용),
`--stage` (설치 후 복사된 경로에 `git add`까지 실행 — 기본은 off).

### 수동 설치 (install.mjs 없이)

Codex CLI, Antigravity, OpenCode, Pi coding agent는 모두 프로젝트 루트의
`.agents/skills/<name>/SKILL.md` 규약을 표준으로 지원한다. Claude Code만
`.claude/skills/<name>/SKILL.md`를 따로 본다.

```bash
cp -r llamacpp-ui-style <target-repo>/.agents/skills/llamacpp-ui-style
mkdir -p <target-repo>/.claude/skills
ln -s ../../.agents/skills/llamacpp-ui-style <target-repo>/.claude/skills/llamacpp-ui-style
```

llama.cpp 저장소(`https://github.com/ggml-org/llama.cpp` 체크아웃) 안에서는 이미 위 두
경로가 구성되어 있다: `.agents/skills/llamacpp-ui-style` (원본) ↔
`.claude/skills/llamacpp-ui-style` (심볼릭 링크). 이 원격 저장소(`lammacpp-style-skills`)는
그 폴더를 그대로 뽑아 배포용으로 올려둔 것이다.

## 이 폴더에 들어있는 것

```
llamacpp-ui-style/
  SKILL.md              # 에이전트가 읽는 진입점 (frontmatter: name, description)
  README.md             # 이 파일 — 설치/재생성 방법
  references/            # 생성된 참고 문서 (직접 편집 금지)
    colors.md
    tokens.md
    components.md          # 색인 — 22개 컴포넌트 목록 + variant 요약 + 링크
    components/
      button.md            # 컴포넌트별 전체 소스/variant (tv() 블록 or 전체 코드)
      badge.md
      dialog.md
      ...                   # ui/ 아래 primitive 개수만큼 자동 생성
    icons.md
    sidebar.md
    typography.md
  scripts/
    generate.mjs          # references/*.md 를 llama.cpp 소스에서 재추출하는 스크립트
    install.mjs           # 이 패키지를 다른 프로젝트(로컬 경로/git 리모트)에 설치하는 스크립트
    bootstrap.mjs         # curl로 받아 node에 바로 파이핑하는 진입점 (내부에서 install.mjs 호출)
```

## 재생성 (llama.cpp webui 스타일이 바뀌었을 때)

`references/*.md`는 전부 자동 생성 파일이다. llama.cpp의 `tools/ui` 스타일이 바뀌면
직접 고치지 말고 스크립트를 다시 돌린다.

```bash
# llama.cpp 저장소 안에서
node .agents/skills/llamacpp-ui-style/scripts/generate.mjs

# 이 패키지만 따로 들고 있고, 별도 llama.cpp 체크아웃을 가리키는 경우
node scripts/generate.mjs --source /path/to/llama.cpp
```

스크립트는 `tools/ui/src/app.css`, `src/lib/components/ui/` 아래 22개 컴포넌트 폴더 전체
(각각 `references/components/<name>.md`로 분리 생성), `src/lib/constants/css-classes.ts`,
전체 `.svelte`/`.ts` 파일의 아이콘 import / 유틸리티 클래스 빈도, `SidebarNavigation.svelte`,
`markdown-content.css`를 읽어서 표/코드블록으로 다시 써낸다. Node 내장 모듈 외 의존성은 없다.
