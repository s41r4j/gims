const { color } = require('../utils/colors');
const os = require('os');

class WhoAmICommand {
    constructor(git) {
        this.git = git;
    }

    async run() {
        const pkg = require('../../../package.json');

        // Get SSOT version from S4 (Tags)
        const { S4Versioning } = require('../utils/s4');
        const s4 = new S4Versioning(this.git);
        const version = (await s4.getCurrentVersion()) || pkg.version;

        const user = os.userInfo().username;
        const hostname = os.hostname();
        const platform = os.platform();
        const arch = os.arch();

        let gitUser = 'unknown';
        let gitEmail = 'unknown';
        try {
            gitUser = (await this.git.raw(['config', 'user.name'])).trim();
            gitEmail = (await this.git.raw(['config', 'user.email'])).trim();
        } catch (e) { }

        console.log(color.bold('\n⚡ GIMS SYSTEM STATUS ⚡\n'));

        console.log(`${color.green('SYSTEM_IDENTITY')}`);
        console.log(`├─ Host:     ${color.cyan(hostname)}`);
        console.log(`├─ User:     ${color.cyan(user)}`);
        console.log(`└─ OS:       ${platform} (${arch})`);

        console.log(`\n${color.green('GIT_OPERATOR')}`);
        console.log(`├─ Name:     ${color.cyan(gitUser)}`);
        console.log(`└─ Email:    ${color.cyan(gitEmail)}`);

        // Parse S4 date/time if available
        let builtAt = 'unknown';
        const parsed = S4Versioning.parse(version);
        if (parsed) {
            const y = parsed.date.substring(0, 4);
            const m = parsed.date.substring(4, 6);
            const d = parsed.date.substring(6, 8);
            const H = parsed.time.substring(0, 2);
            const M = parsed.time.substring(2, 4);
            const dateObj = new Date(`${y}-${m}-${d}T${H}:${M}:00`);
            builtAt = `${dateObj.toDateString()} @ ${H}:${M}`;
        }

        console.log(`\n${color.green('TOOL_METRICS')}`);
        console.log(`├─ Version:  ${color.magenta(version)}`);
        console.log(`├─ Built:    ${builtAt}`);
        console.log(`├─ Engine:   Node ${process.version}`);
        console.log(`└─ Author:   ${pkg.author}`);

        console.log('\n' + color.dim('----------------------------------------'));
        console.log(color.dim(`Initialized at: ${new Date().toISOString()}`));
    }
}

module.exports = { WhoAmICommand };
