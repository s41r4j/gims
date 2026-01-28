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
        const { info, dryRun, stage } = options;

        try {
            // 1. Get current version
            const currentVersion = await this.getCurrentVersion();
            if (!currentVersion) {
                throw new Error('Could not find version in package.json or VERSION file');
            }

            // 2. Info mode
            if (info) {
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

            // 5. Update files
            console.log(`\nBumping version: ${color.dim(currentVersion)} → ${color.green(nextVersion)}`);

            const updatedFiles = [];

            // Update package.json
            if (this.updatePackageJson(nextVersion)) updatedFiles.push('package.json');

            // Update .env
            const envUpdates = this.updateEnvFiles(nextVersion);
            updatedFiles.push(...envUpdates);

            // Create VERSION file if it doesn't exist or update it
            fs.writeFileSync('VERSION', nextVersion);
            updatedFiles.push('VERSION');

            if (updatedFiles.length > 0) {
                console.log(`${color.green('✔')} Updated ${updatedFiles.join(', ')}`);
            }

            // 6. Git commit and tag
            await this.createRelease(nextVersion, updatedFiles);

        } catch (error) {
            Progress.error(`Version bump failed: ${error.message}`);
        }
    }

    async getCurrentVersion() {
        // Try package.json
        if (fs.existsSync('package.json')) {
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            if (pkg.version) return pkg.version;
        }

        // Try VERSION file
        if (fs.existsSync('VERSION')) {
            return fs.readFileSync('VERSION', 'utf8').trim();
        }

        return '0.0.0'; // Default start
    }

    updatePackageJson(newVersion) {
        if (!fs.existsSync('package.json')) return false;

        const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        pkg.version = newVersion;
        fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
        return true;
    }

    updateEnvFiles(newVersion) {
        const updates = [];
        const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];

        envFiles.forEach(file => {
            if (fs.existsSync(file)) {
                let content = fs.readFileSync(file, 'utf8');
                let changed = false;

                // Match VERSION=... or APP_VERSION=...
                const regex = /^(VERSION|APP_VERSION|NEXT_PUBLIC_VERSION)=(.*)$/gm;

                if (regex.test(content)) {
                    content = content.replace(regex, `$1=${newVersion}`);
                    changed = true;
                } else {
                    // Optionally append if missing? Maybe too aggressive.
                }

                if (changed) {
                    fs.writeFileSync(file, content);
                    updates.push(file);
                }
            }
        });

        return updates;
    }

    async createRelease(version, files) {
        try {
            // Stage files
            await this.git.add(files);

            // Commit
            const msg = `chore(release): bump to ${version}`;
            await this.git.commit(msg);

            // Tag
            await this.git.addAnnotatedTag(version, `Release ${version}`);

            console.log(`${color.green('✔')} Created git commit and tag: ${color.cyan(version)}`);
            console.log(`\nRun ${color.cyan('g push --follow-tags')} to publish`);
        } catch (e) {
            console.log(color.yellow(`⚠ Git operations failed: ${e.message}`));
        }
    }

    showInfo(versionStr) {
        const parsed = S4Versioning.parse(versionStr);
        if (!parsed) {
            console.log(color.red('Invalid S4 version format'));
            return;
        }

        console.log(color.bold('\nS4 Version Analysis:'));
        console.log(`Major: ${parsed.major}`);
        console.log(`Minor: ${parsed.minor}`);
        console.log(`Patch: ${parsed.patch}`);
        console.log(`Stage: ${color.magenta(parsed.stage)}`);
        console.log(`Build: ${parsed.build}`);
        console.log(`Time:  ${parsed.date} @ ${parsed.time}`);
        console.log(`Git:   ${parsed.branch} (${parsed.commit})`);
    }
}

module.exports = { VersionCommand };
