#!/usr/bin/env node
// Zero-clone entry point. Fetch just this file over anonymous HTTPS and pipe it
// into node — no local checkout of the package needed beforehand:
//
//   curl -fsSL https://yootwo.kro.kr:13100/zaenam/lammacpp-style-skills/raw/branch/main/scripts/bootstrap.mjs \
//     | node - <git-remote-url|local-repo-path> [install.mjs options]
//
// This only works once the lammacpp-style-skills repo is public (anonymous
// `git clone` must succeed with no credentials). Internally this still does a
// `git clone --depth 1` of the package to a scratch temp dir — the point is
// the *user* never types that step, not that git is avoided entirely.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const PACKAGE_REPO = 'https://yootwo.kro.kr:13100/zaenam/lammacpp-style-skills.git';

function parseArgs(argv) {
	const args = { branch: null, rest: [] };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === '--branch') args.branch = argv[++i];
		else args.rest.push(argv[i]);
	}
	return args;
}

function run(cmd, cmdArgs, opts = {}) {
	const res = spawnSync(cmd, cmdArgs, { stdio: 'inherit', ...opts });
	if (res.error) throw res.error;
	if (res.status !== 0) {
		throw new Error(`\`${cmd} ${cmdArgs.join(' ')}\` exited with code ${res.status}`);
	}
}

function main() {
	const { branch, rest } = parseArgs(process.argv.slice(2));
	if (rest.length === 0) {
		console.error(
			'Usage: curl -fsSL <bootstrap-url> | node - <git-remote-url|local-repo-path> [install.mjs options]'
		);
		process.exit(1);
	}

	const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lammacpp-style-skills-src-'));
	console.log(`Fetching package source -> ${srcDir}`);
	const cloneArgs = ['clone', '--depth', '1'];
	if (branch) cloneArgs.push('--branch', branch);
	cloneArgs.push(PACKAGE_REPO, srcDir);
	run('git', cloneArgs);

	const installScript = path.join(srcDir, 'scripts', 'install.mjs');
	if (!fs.existsSync(installScript)) {
		throw new Error(`scripts/install.mjs not found in ${PACKAGE_REPO} — repo layout changed?`);
	}

	run('node', [installScript, ...rest]);

	fs.rmSync(srcDir, { recursive: true, force: true });
}

main();
