#!/usr/bin/env node
// One-shot installer: point this at a git remote URL (or a local repo path)
// and it drops this whole skill package into that repo's .agents/skills/
// (native to Codex CLI, Antigravity, OpenCode, Pi) plus a .claude/skills/
// symlink (for Claude Code). It never commits or pushes for you.
//
// Usage:
//   node install.mjs [git-remote-url|local-repo-path] [options]
//
// If the target is omitted, installs into the current directory.
//
// Options:
//   --branch <name>   branch/tag/ref to check out when cloning a remote (default: repo HEAD)
//   --no-claude       skip the .claude/skills symlink
//   --copy-claude     copy instead of symlink for .claude/skills (use if the target
//                     filesystem/CI can't handle symlinks, e.g. some Windows setups)
//   --stage           also run `git add` on the copied paths after installing
//                     (default: off — install only touches the filesystem, never git state)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_DIR = path.resolve(SCRIPT_DIR, '..');

// Read the skill name from SKILL.md's frontmatter rather than the folder name —
// this package's root dir name changes depending on what the clone/checkout is
// called (e.g. a standalone "lammacpp-style-skills" repo vs. ".agents/skills/llamacpp-ui-style"),
// but the `name:` field is the stable identifier.
function readPackageName() {
	const skillMd = fs.readFileSync(path.join(PACKAGE_DIR, 'SKILL.md'), 'utf8');
	const match = skillMd.match(/^---\r?\n[\s\S]*?^name:\s*(\S+)\s*$/m);
	if (!match) throw new Error('Could not find `name:` in SKILL.md frontmatter');
	return match[1];
}

const PACKAGE_NAME = readPackageName();

function parseArgs(argv) {
	const args = { target: null, branch: null, claude: true, copyClaude: false, stage: false };
	const positional = [];
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (a === '--branch') args.branch = argv[++i];
		else if (a === '--no-claude') args.claude = false;
		else if (a === '--copy-claude') args.copyClaude = true;
		else if (a === '--stage') args.stage = true;
		else positional.push(a);
	}
	args.target = positional[0] ?? null;
	return args;
}

function isGitUrl(s) {
	return /^(https?:\/\/|git@|ssh:\/\/|git:\/\/)/.test(s) || s.endsWith('.git');
}

function run(cmd, cmdArgs, opts = {}) {
	const res = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
	if (res.error) throw res.error;
	if (res.status !== 0) {
		throw new Error(`\`${cmd} ${cmdArgs.join(' ')}\` exited with code ${res.status}`);
	}
}

function main() {
	const args = parseArgs(process.argv.slice(2));
	if (!args.target) {
		args.target = process.cwd();
		console.log(`No target given — installing into current directory: ${args.target}`);
	}

	let repoDir;
	let isTempClone = false;

	if (isGitUrl(args.target)) {
		repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'llamacpp-ui-style-install-'));
		isTempClone = true;
		console.log(`Cloning ${args.target} -> ${repoDir}`);
		const cloneArgs = ['clone', '--depth', '1'];
		if (args.branch) cloneArgs.push('--branch', args.branch);
		cloneArgs.push(args.target, repoDir);
		run('git', cloneArgs);
	} else {
		repoDir = path.resolve(args.target);
		if (!fs.existsSync(repoDir)) {
			console.error(`Local path does not exist: ${repoDir}`);
			process.exit(1);
		}
	}

	// 1. .agents/skills/<name> — the real, portable copy every supported tool reads.
	const agentsDest = path.join(repoDir, '.agents', 'skills', PACKAGE_NAME);
	const installingOverSelf = path.resolve(agentsDest) === path.resolve(PACKAGE_DIR);
	if (installingOverSelf) {
		// Target resolves to this very package directory (e.g. running install.mjs
		// with no target from inside a checkout that already has it at this path).
		// rm -rf + copy would delete PACKAGE_DIR before copying from it — skip instead.
		console.log(`Already installed at ${path.relative(repoDir, agentsDest)} — skipping copy.`);
	} else {
		fs.mkdirSync(path.dirname(agentsDest), { recursive: true });
		fs.rmSync(agentsDest, { recursive: true, force: true });
		fs.cpSync(PACKAGE_DIR, agentsDest, {
			recursive: true,
			filter: (src) => !src.split(path.sep).includes('.git')
		});
		console.log(`Copied package -> ${path.relative(repoDir, agentsDest)}`);
	}

	// 2. .claude/skills/<name> — Claude Code only looks here, not .agents/skills.
	if (args.claude) {
		const claudeSkillsDir = path.join(repoDir, '.claude', 'skills');
		fs.mkdirSync(claudeSkillsDir, { recursive: true });
		const claudeDest = path.join(claudeSkillsDir, PACKAGE_NAME);
		fs.rmSync(claudeDest, { recursive: true, force: true });
		if (args.copyClaude) {
			fs.cpSync(agentsDest, claudeDest, { recursive: true });
			console.log(`Copied -> ${path.relative(repoDir, claudeDest)}`);
		} else {
			fs.symlinkSync(path.join('..', '..', '.agents', 'skills', PACKAGE_NAME), claudeDest);
			console.log(`Symlinked -> ${path.relative(repoDir, claudeDest)}`);
		}
	}

	// 3. Only touches git state if explicitly asked to (--stage). Default is a
	// pure filesystem copy — no git add, no commit, no push.
	if (args.stage && fs.existsSync(path.join(repoDir, '.git'))) {
		const toAdd = ['.agents/skills/' + PACKAGE_NAME];
		if (args.claude) toAdd.push('.claude/skills/' + PACKAGE_NAME);
		run('git', ['add', ...toAdd], { cwd: repoDir });
		console.log('Staged (git add) — nothing committed or pushed.');
	}

	console.log(`\nDone. Installed into: ${repoDir}`);
	if (isTempClone) {
		console.log(
			[
				'',
				'This is a temporary clone, not your working copy. To ship it:',
				`  cd ${repoDir}`,
				'  git add .agents/skills/' + PACKAGE_NAME + (args.claude ? ' .claude/skills/' + PACKAGE_NAME : ''),
				'  git commit -m "add llamacpp-ui-style skill"',
				'  git push',
				'',
				'(or just copy .agents/skills/llamacpp-ui-style out of this temp dir into your',
				' real checkout instead of pushing from here)'
			].join('\n')
		);
	} else if (!args.stage) {
		console.log('Nothing staged. Run `git status` to see the new files; `git add` if/when you want them.');
	} else {
		console.log('Review with `git status` / `git diff --cached`, then commit yourself.');
	}
}

main();
