import nodegit from 'nodegit';
import fs from 'fs';
const PATH_TO_COMMIT_FILE = "last_commit_hash"
import _ from 'lodash';

const postChangelog = () => {
    nodegit.Repository.open(".").then(async repo => {
        const headCommit = await repo.getMasterCommit();

        if (fs.existsSync(PATH_TO_COMMIT_FILE)) {
            const lastCommit = fs.readFileSync(PATH_TO_COMMIT_FILE).toString().trim()
            const history = headCommit.history();

            let changeLog = [];

            history.on("commit", commit => {
                if (commit.sha() === lastCommit) {
                    history.emit("end");
                    history.removeAllListeners();
                    return;
                }

                changeLog.push(`${commit.message().trim()}`)
            });

            history.on("end", () => {
                if (changeLog.length > 0) {
                    changeLog = _.reverse(changeLog)
                    changeLog = changeLog.map((line, i) => `\`${i + 1}. ${line}\``)

                    currentDiscordChannel.send("**Changes since last restart:**\n" + changeLog.join("\n"))
                }
            })

            history.start();
        }

        fs.writeFileSync(PATH_TO_COMMIT_FILE, headCommit.sha())
    })
}

export default {
    postChangelog
};
