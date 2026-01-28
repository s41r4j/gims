const fs = require('fs');
const path = require('path');
const { S4Versioning } = require('../utils/s4');
const { color } = require('../utils/colors');
const { Progress } = require('../utils/progress');

class VersionCommand {
    constructor(git, configManager) {
        this.git = git;
        this.configManager = configManager;
        this.s4 = new S4Versioning(git);
    }

    async run(type = 'auto', options = {}) {
        const { info, dryRun, stage, list, prune, all } = options;

        try {
            // --- Special Commands: List & Prune ---
            if (list) {
                await this.listTags(all);
                return;
            }

            if (prune) {
                await this.pruneTags();
                return;
            }

            // --- Main Bump Logic ---

            // 1. Get current version from Git Tags (SSOT)
            let currentVersion = await this.s4.getCurrentVersion();
            let source = 'git-tag';

            // Fallback: If no tags, check package.json just for migration base
            if (!currentVersion) {
                currentVersion = this.getPackageJsonVersion() || '0.0.0';
                source = 'package.json (fallback)';
            }

            // 2. Info mode
            if (info) {
                console.log(`Current Version: ${color.green(currentVersion)} (${source})`);
                this.showInfo(currentVersion);
                return;
            }

            // 3. Calculate next version
            Progress.start('Calculated next version...');
            const nextVersion = await this.s4.bump(currentVersion, type, stage);
            Progress.stop('');

            // 4. Dry run
            if (dryRun) {
                console.log(color.bold('\nDry Run Results:'));
                console.log(`Current: ${color.dim(currentVersion)}`);
                console.log(`Next:    ${color.green(nextVersion)}`);
                this.showInfo(nextVersion);
                return;
            }

            // 5. Execution (Tag + .env)
            console.log(`\nBumping version: ${color.dim(currentVersion)} → ${color.green(nextVersion)}`);

            const updatedFiles = [];

            // Update .env (Only if exists)
            const envUpdates = this.updateEnvFiles(nextVersion);
            updatedFiles.push(...envUpdates);

            if (updatedFiles.length > 0) {
                console.log(`${color.green('✔')} Updated ${updatedFiles.join(', ')}`);
                // Stage .env updates if any (usually gitignored, but if not...)
                // We won't auto-commit them to avoid messing with user's git config too much logic
                // But usually .env is ignored.
            }

            // 6. Create Git Tag (The Truth)
            await this.createTag(nextVersion);

        } catch (error) {
            Progress.error(`Version bump failed: ${error.message}`);
        }
    }

    getPackageJsonVersion() {
        if (fs.existsSync('package.json')) {
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            return pkg.version;
        }
        return null;
    }

    updateEnvFiles(newVersion) {
        const updates = [];
        const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];

        envFiles.forEach(file => {
            if (fs.existsSync(file)) {
                let content = fs.readFileSync(file, 'utf8');
                let changed = false;

                // Match common version vars
                const regex = /^(VERSION|APP_VERSION|NEXT_PUBLIC_VERSION|REACT_APP_VERSION|S4_VERSION)=(.*)$/gm;

                if (regex.test(content)) {
                    content = content.replace(regex, `$1=${newVersion}`);
                    changed = true;
                }

                if (changed) {
                    fs.writeFileSync(file, content);
                    updates.push(file);
                }
            }
        });

        return updates;
    }

    async createTag(version) {
        try {
            // Create lightweight or annotated tag? S4 recommends annotated.
            await this.git.addAnnotatedTag(version, `Release ${version}`);
            console.log(`${color.green('✔')} Created git tag: ${color.cyan(version)}`);
            console.log(`\nRun ${color.cyan('g push --tags')} to publish`);
        } catch (e) {
            console.log(color.yellow(`⚠ Git tag failed: ${e.message}`));
        }
    }

    async listTags(showAll) {
        const tags = await this.git.tags();
        if (!tags.all.length) {
            console.log('No tags found.');
            return;
        }

        console.log(color.bold('\nRelease History:'));

        // Reverse order (newest first)
        // Filter out dev tags unless --all
        const filtered = tags.all.filter(t => {
            if (showAll) return true;
            return !t.includes('-dev.');
        }).reverse();

        if (filtered.length === 0) {
            console.log(color.dim('No stable/beta/rc tags found. Use --all to see dev tags.'));
            return;
        }

        filtered.forEach(t => {
            console.log(`- ${t}`);
        });
    }

    async pruneTags() {
        Progress.start('Pruning old dev tags...');
        const tags = await this.git.tags();
        const allTags = tags.all;

        // Identify dev tags
        const devTags = allTags.filter(t => t.includes('-dev.'));

        // Sort them ensuring we keep the newest
        // (Using simple string sort works roughly if S4 format is strictly kept, 
        // but better to rely on S4 parse if possible. For simplicity here, we assume standard S4)

        // We want to KEEP the last 10 dev tags.
        if (devTags.length <= 10) {
            Progress.stop('');
            console.log('Fewer than 10 dev tags. No pruning needed.');
            return;
        }

        // Identify tags to delete (older ones)
        // S4 strings sort chronologically well enough lexicographically mostly, 
        // but let's trust the array order returned by git tags usually... 
        // actually git tags return is arbitrary.

        // Let's use our S4 sorter from utility if possible, or just simple sort
        // Assuming S4Versioning.getCurrentVersion logic uses sort, we can reuse it? 
        // Or just simple sort for now.
        devTags.sort(); // Lexicographical sort (older dates come first: 2025... < 2026...)

        const toKeep = 10;
        const toDelete = devTags.slice(0, devTags.length - toKeep);

        for (const tag of toDelete) {
            await this.git.tag(['-d', tag]);
        }

        Progress.stop('');
        console.log(`${color.green('✔')} Deleted ${toDelete.length} old dev tags.`);
        console.log(color.dim('Kept last 10 dev tags + all stable tags.'));
    }

    showInfo(versionStr) {
        const parsed = S4Versioning.parse(versionStr);
        if (!parsed) {
            console.log(color.red('Invalid S4 version format'));
            return;
        }

        // Format date/time
        const y = parsed.date.substring(0, 4);
        const m = parsed.date.substring(4, 6);
        const d = parsed.date.substring(6, 8);
        const H = parsed.time.substring(0, 2);
        const M = parsed.time.substring(2, 4);
        const dateObj = new Date(`${y}-${m}-${d}T${H}:${M}:00`);

        // 12-hour format logic
        let hour = parseInt(H);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12;
        hour = hour ? hour : 12; // the hour '0' should be '12'
        const time12 = `${hour}:${M} ${ampm}`;

        console.log(color.bold('\nS4 Version Analysis:'));
        console.log(`Major: ${parsed.major}`);
        console.log(`Minor: ${parsed.minor}`);
        console.log(`Patch: ${parsed.patch}`);
        console.log(`Stage: ${color.magenta(parsed.stage)}`);
        console.log(`Build: ${parsed.build}`);
        console.log(`Date:  ${dateObj.toDateString()}`);
        console.log(`Time:  ${time12} (${H}:${M})`);
        console.log(`Git:   ${parsed.branch} (${parsed.commit})`);
    }
}

module.exports = { VersionCommand };
