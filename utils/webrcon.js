const parser = require("node-html-parser")
const Browser = require("zombie")


const fetchNewWebrconCredentials = async () => {
    // We use a real browser here rather than pure GET requests, because we need to save/upload cookies and god knows
    // what else, so using an actual browser that does it for us is much easier.

    // Without this the requests time out
    Browser.waitDuration = '30s'

    const browser = new Browser()
    await browser.visit("https://www.webrcon.com/guest.php")

    const root = parser.parse(browser.source)
    const sessionId = root.querySelector('#sessionID').getAttribute("value")
    const cKey = root.querySelector('#ckey').getAttribute("value")

    return {sessionId, cKey}
}


module.exports = {
    fetchNewWebrconCredentials
}