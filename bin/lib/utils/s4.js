const simpleGit = require('simple-git');
const path = require('path');
const fs = require('fs');

class S4Versioning {
    constructor(git) {
        this.git = git || simpleGit();
    }

    // Regex for parsing S4 version
    static get REGEX() {
        return /^([0-9]+)\.([0-9]+)\.([0-9]+)-([a-z]+)\.([0-9]+)\+([0-9]{8})\.([0-9]{4})\.([0-9a-f]+)\.([a-zA-Z0-9._\/-]+)$/;
    }

    /**
     * Parse an S4 version string into components
     */
    static parse(versionStr) {
        if (!versionStr) return null;
        const match = versionStr.match(S4Versioning.REGEX);
        if (!match) return null;

        return {
            major: parseInt(match[1]),
            minor: parseInt(match[2]),
            patch: parseInt(match[3]),
            stage: match[4],
            build: parseInt(match[5]),
            date: match[6],
            time: match[7],
            commit: match[8],
            branch: match[9],
            original: versionStr
        };
    }

    /**
     * Generate S4 version string from components
     */
    static stringify(components) {
        const { major, minor, patch, stage, build, date, time, commit, branch } = components;
        return `${major}.${minor}.${patch}-${stage}.${build}+${date}.${time}.${commit}.${branch}`;
    }

    /**
     * Get the latest S4 version from Git Tags
     */
    async getCurrentVersion() {
        try {
            // Get all tags
            const tags = await this.git.tags();
            if (!tags.all || tags.all.length === 0) {
                return null; // No tags yet
            }

            // Filter and sort S4 tags
            // Sorting strategy: We rely on the date+time in the S4 string for chronological order
            // but S4 strings format puts SemVer first.
            // Let's parse all valid S4 tags and sort them.

            const parsedTags = tags.all
                .map(t => ({ tag: t, parsed: S4Versioning.parse(t) }))
                .filter(item => item.parsed !== null);

            if (parsedTags.length === 0) return null;

            // Sort logic: 
            // 1. Major.Minor.Patch
            // 2. Date.Time
            // 3. Build

            parsedTags.sort((a, b) => {
                const pA = a.parsed;
                const pB = b.parsed;

                if (pA.major !== pB.major) return pA.major - pB.major;
                if (pA.minor !== pB.minor) return pA.minor - pB.minor;
                if (pA.patch !== pB.patch) return pA.patch - pB.patch;

                // Compare Date (YYYYMMDD)
                const dateA = parseInt(pA.date);
                const dateB = parseInt(pB.date);
                if (dateA !== dateB) return dateA - dateB;

                // Compare Time (HHMM)
                const timeA = parseInt(pA.time);
                const timeB = parseInt(pB.time);
                if (timeA !== timeB) return timeA - timeB;

                return pA.build - pB.build;
            });

            // Return the latest
            return parsedTags[parsedTags.length - 1].tag;

        } catch (e) {
            return null;
        }
    }

    /**
     * Migrate a standard SemVer or empty version to S4
     */
    async migrate(currentVersion) {
        // Basic SemVer parsing (loose)
        const semVerMatch = currentVersion.match(/^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-([a-zA-Z0-9.]+))?/);

        let base = {
            major: 0, minor: 0, patch: 0, stage: 'dev', build: 1
        };

        if (semVerMatch) {
            base.major = parseInt(semVerMatch[1]);
            base.minor = parseInt(semVerMatch[2]);
            base.patch = parseInt(semVerMatch[3]);
            // Attempt to salvage stage if present, else default to dev
            if (semVerMatch[4]) {
                const parts = semVerMatch[4].split('.');
                const possibleStage = parts.find(p => /^[a-z]+$/.test(p));
                if (possibleStage) base.stage = possibleStage;
            }
        }

        const ctx = await this.getContext();
        return S4Versioning.stringify({ ...base, ...ctx });
    }

    /**
     * Get current Git and Time context
     */
    async getContext() {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
        const time = `${pad(now.getHours())}${pad(now.getMinutes())}`;

        let commit = '0000000';
        let branch = 'unknown';

        try {
            const isRepo = await this.git.checkIsRepo();
            if (isRepo) {
                commit = (await this.git.revparse(['--short=7', 'HEAD'])).trim();
                branch = (await this.git.revparse(['--abbrev-ref', 'HEAD'])).trim();
            }
        } catch (e) {
            // Ignore git errors, stick to defaults
        }

        // Sanitize branch name for S4 compliance
        branch = branch.replace(/[^a-zA-Z0-9._\/-]/g, '-');

        return { date, time, commit, branch };
    }

    /**
     * Calculate next version based on bump type
     */
    async bump(currentStr, type = 'auto', stageVal = null) {
        let parsed = S4Versioning.parse(currentStr);

        // If not S4, migrate first
        if (!parsed) {
            const migrated = await this.migrate(currentStr);
            parsed = S4Versioning.parse(migrated);
        }

        const ctx = await this.getContext();
        const next = { ...parsed, ...ctx }; // Update context (date, time, commit, branch)

        // Handle stage change
        if (stageVal && stageVal !== parsed.stage) {
            next.stage = stageVal;
            next.build = 1;
        }

        // Logic for bumping
        switch (type) {
            case 'major':
                next.major++;
                next.minor = 0;
                next.patch = 0;
                next.build = 1;
                break;
            case 'minor':
                next.minor++;
                next.patch = 0;
                next.build = 1;
                break;
            case 'patch':
                next.patch++;
                next.build = 1;
                break;
            case 'auto':
                // Smart Auto Logic

                // 1. If Date Changed, reset build to 1
                if (parsed.date !== ctx.date) {
                    next.build = 1;
                }
                // 2. If Date is SAME
                else {
                    // If Commit Changed -> new build
                    if (parsed.commit !== ctx.commit) {
                        next.build = parsed.build + 1;
                    }
                    // If same commit & same date, usually we don't need a new tag 
                    // unless user forces it. 
                    // For safety, increment build to ensure uniqueness if they insisted on running `g v`.
                    else {
                        next.build = parsed.build + 1;
                    }
                }
                break;
        }

        return S4Versioning.stringify(next);
    }
}

module.exports = { S4Versioning };
