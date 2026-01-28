const { color } = require('../utils/colors');
const os = require('os');

class WhoAmICommand {
    constructor(git) {
        this.git = git;
    }

    async run() {
        const pkg = require('../../../package.json');
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

        console.log(`\n${color.green('TOOL_METRICS')}`);
        console.log(`├─ Version:  ${color.magenta(pkg.version)}`);
        console.log(`├─ Engine:   Node ${process.version}`);
        console.log(`└─ Author:   ${pkg.author}`);

        console.log('\n' + color.dim('----------------------------------------'));
        console.log(color.dim(`Initialized at: ${new Date().toISOString()}`));
    }
}

module.exports = { WhoAmICommand };
