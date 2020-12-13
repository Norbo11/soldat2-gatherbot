import logger from '../utils/logger';
import WebSocket from 'ws';
import random from '../utils/random';
import _ from 'lodash';

// const sslRootCAs = require('ssl-root-cas/latest')
// sslRootCAs.inject().addFile(__dirname + "/../certs/webrcon.com")

// TODO: For some reason we are unable to validate the webrcon.com certificate. I am not too sure
//  about how this should work, this is a temporary workaround. Above is a hint of what we should possibly be doing.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const WEBSOCKET_URL = 'wss://webrcon.com:8006'
const DEFAULT_RESPONSE_TIMEOUT = 7000

class Soldat2Client {

    constructor(logPrefix, ws, initialized) {
        this.ws = ws;
        this.initialized = initialized;
        this.logPrefix = logPrefix;

        // For debugging
        // ws.addListener("message", (data) =>
        //     console.log(data)
        // )
    }

    log(logType, logLine) {
        if (logType === "error") {
            logger.log.error(`${this.logPrefix} ${logLine}`)
        } else {
            logger.log.info(`${this.logPrefix} ${logLine}`)
        }
    }

    static async fromWebRcon(logPrefix, sessionId, ckey) {
        return new Promise((resolve, reject) => {
            const ws = new WebSocket(WEBSOCKET_URL);
            const client = new Soldat2Client(logPrefix, ws, false)

            ws.on("open", () => {
                client.log("info", `WebSocket connection opened with ${WEBSOCKET_URL}`)
                let loginMessage = NetworkMessage.Login(sessionId, ckey)

                client.sendMessage(loginMessage);

                // Upon connecting, webrcon is going to replay us all of the messages since this webrcon session started.
                // We don't want to handle any events that have happened in the past. Thus we use the "echotest" command
                // that simply replies with whatever input we give it. We embed a random string in order to ensure we read the correct
                // response from echotest for this invocation of the bot, without having to deal with the message timestamp
                // or anything else more messy. Once we receive our echo, we can set the "initialized" flag to true; this is
                // used to kick off the soldat events handlers.

                // Furthermore, we only resolve this promise once the initialization command is received. This is
                // allows us to synchronously order the initial connections we make with all our servers. This is very
                // important as it seems that WebRcon doesn't like us establishing multiple connections concurrently,
                // so we make sure to connect to each server one at a time.

                client.pingServer((response) => {
                    if (response !== undefined) {
                        client.log("info", "Received the initialization command; setting initialized = true.")
                        client.initialized = true;
                        resolve(client)
                    } else {
                        client.log("error", "Did not receive a response after initial ping; this server will not be functional")
                        reject()
                    }
                }, DEFAULT_RESPONSE_TIMEOUT * 3, false);
            });

            ws.on("message", (data) => {
                const networkMessage = getNetworkMessage(data);
                const messageType = networkMessage.ReadMessageType();

                if (messageType === MessageType.Error) {
                    client.log("error", `Received error from server: ${networkMessage.raw}`)
                } else if (messageType === MessageType.SetState) {
                    const value = networkMessage.ReadUint8();
                    let state;
                    for (var x in ConnectionState) {
                        if (ConnectionState[x].value === value) {
                            state = ConnectionState[x];
                            break;
                        }
                    }
                    client.log("info", `Received new state from server: ${state.name}`)
                } else if (messageType !== MessageType.LogLine) {
                    client.log("info", `Received unhandled message type from server: ${messageType.name}`)
                }
            })

            ws.on("error", error => {
                client.log("error", `Received error from server: ${error.message}\n${error.stack}`)
            })

            ws.on("close", (code, reason) => {
                client.log("error", `WebSocket connection was closed (code ${code}, reason ${reason})`)
            })
        })
    }

    listenForServerResponse(eventDescription,
                            processData,
                            callback = () => {
                            },
                            timeout = DEFAULT_RESPONSE_TIMEOUT,
                            verbose = true) {

        const noResponseTimer = setTimeout(() => {
            this.log("error", `Did not receive event "${eventDescription}" after ${timeout}ms has passed! Removing listener.`)
            this.ws.removeListener("message", listener)
            callback(undefined)
        }, timeout)

        const listener = (data) => {
            const eventText = maybeGetLogLine(data);

            if (eventText === false) {
                return;
            }

            if (verbose) {
                this.log("info", `Received active event from server: ${eventText.trim()}`)
            }

            const result = processData(eventText)

            if (result !== undefined && result !== false) {
                this.log("info", `Got the data that we wanted: ${eventText}`)

                this.ws.removeListener("message", listener)
                clearTimeout(noResponseTimer)
                callback(result)
            }
        }

        this.ws.addListener("message", listener)

    }

    pingServer(callback, timeout = DEFAULT_RESPONSE_TIMEOUT) {
        // This command doesn't just ping the server directly; it uses the webrcon connection send a message to thhe
        // server and expects to receive a response.

        let randomString = random.getRandomString()

        this.listenForServerResponse("ping response", (text) => {
            const regex = new RegExp("\\[(?<time>.*)] Return value: ping_command_" + randomString)
            return !!text.match(regex);
        }, callback, timeout)

        this.sendMessage(NetworkMessage.Command(0, "echotest ping_command_" + randomString))
    }

    sendMessage(netMessage) {
        this.ws.send(netMessage.raw);
    }

    changeMap(mapName, gameMode, callback) {
        const message = NetworkMessage.Command(0, `loadmap ${mapName} ${gameMode}`)

        this.listenForServerResponse("map clear after loadmap", (text) => {
            if (text.match(/MAP CLEAR/)) {
                return "found";
            }

            if (text.match(/Level '.*?' not found/)) {
                return "not_found";
            }

            return false;
        }, callback)

        this.sendMessage(message)
    }

    restart(callback) {
        const message = NetworkMessage.Command(0, `restart`)

        this.listenForServerResponse("map clear after restart", (text) => {
            return !!text.match(/MAP CLEAR/);
        }, callback)

        this.sendMessage(message)
    }

    getPlayerInfo(playerName, callback) {
        const message = NetworkMessage.Command(0, `listplayers`)

        this.listenForServerResponse("listplayers response", (text) => {
            const match = text.match(new RegExp(`\\[(?<time>.*?)] \(?<num>.*?) ${_.escapeRegExp(playerName)} \\[id] (?<id>.*?) \\[account] (?<playfabId>.*?) \\[team] (?<teamId>.*?) \\[score] (?<score>.*?) \\[kills] (?<kills>.*?) \\[deaths] (?<deaths>.*?) \\[spawned] (?<spawned>.*)`))

            if (match === null) {
                return false
            } else {
                return {
                    id: match.groups["id"],
                    name: playerName,
                    playfabId: match.groups["playfabId"],
                    teamId: match.groups["teamId"],
                    score: match.groups["score"],
                    kills: match.groups["kills"],
                    deaths: match.groups["deaths"],
                    spawned: match.groups["spawned"],
                }
            }
        }, callback)

        this.sendMessage(message)
    }
}

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}


// For tests
function toBuffer(ab) {
    var buf = Buffer.alloc(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}


function getNetworkMessage(data) {
    data = toArrayBuffer(data)
    const dataView = new DataView(data);
    return new NetworkMessage(dataView.buffer);
}

function maybeGetLogLine(data) {
    const message = getNetworkMessage(data);
    const type = message.ReadMessageType();

    if (type === MessageType.LogLine) {
        return NetworkMessage.ProcessLogLine(message);
    }

    return false;
}


const MessageType = {
    Login: {value: 0xA0, name: "Login"},
    SetState: {value: 0xA1, name: "SetState"},
    Error: {value: 0x02, name: "Error"},
    LoginOk: {value: 0x03, name: "LoginOk"},
    NewTab: {value: 0x04, name: "NewTab"},
    LogLine: {value: 0x06, name: "LogLine"},
    Command: {value: 0x09, name: "Command"},
    CommandInfo: {value: 0xA2, name: "CommandInfo"},
    CloseTab: {value: 0xA3, name: "CloseTab"}
};


const ConnectionState = {
    Unlinked: {value: 0x00, name: "Unlinked"},
    Linked: {value: 0x01, name: "Linked"},
    Disconnected: {value: -0x01, name: "Disconnected"}
};


class NetworkMessage {

    constructor(raw) {
        this.Init();
        if (raw === undefined)
            this.payload = new ArrayBuffer(this.maxMessageLength - this.headerSize);
        else
            this.payload = raw.slice(2, raw.byteLength);
        this.dataView = new DataView(this.payload);
    }

    Init() {
        this.position = 0;
        this.headerSize = 3;
        this.maxMessageLength = 65535;
    };

    WriteString(text) {
        this.WriteUint16(text.length * 4);
        for (var i = 0; i < text.length; i++) {
            var codePoint = text.codePointAt(i);
            this.WriteUint32(codePoint);
        }
    };

    WriteUint16(num) {
        this.dataView.setUint16(this.position, num);
        this.ReverseBytes(this.position, 2);
        this.position += 2;
    };

    WriteUint32(num) {
        this.dataView.setUint32(this.position, num);
        this.ReverseBytes(this.position, 4);
        this.position += 4;
    };

    Build(type) {
        this.raw = new ArrayBuffer(this.position + this.headerSize);
        var dataView = new DataView(this.raw);
        for (var i = 0; i < this.position; i++) {
            var byte = this.dataView.getUint8(i);
            dataView.setUint8(this.headerSize + i, byte);
        }
        dataView.setUint16(0, this.raw.byteLength - 2);
        dataView.setUint8(2, type.value);
    };

    ReverseBytes(position, numBytes) {
        var bytes = [];
        for (var i = 0; i < numBytes; i++)
            bytes[numBytes - 1 - i] = this.dataView.getUint8(position + i);
        for (var j = 0; j < numBytes; j++)
            this.dataView.setUint8(position + j, bytes[j]);
    };

    static Login(sessionID, ckey) {
        var message = new NetworkMessage();
        message.WriteString(sessionID);
        message.WriteString(ckey);
        message.Build(MessageType.Login);
        return message;
    };

    ReadString() {
        var length = this.ReadUint16();
        var text = "";
        for (var i = 0; i < length / 4; i++) {
            var char = String.fromCodePoint(this.ReadUint32());
            text += char;
        }
        return text;
    };

    ReadUint8() {
        var result = this.dataView.getUint8(this.position);
        this.position += 1;
        return result;
    };

    ReadUint16() {
        this.ReverseBytes(this.position, 2);
        var result = this.dataView.getUint16(this.position);
        this.position += 2;
        return result;
    };

    ReadUint32() {
        this.ReverseBytes(this.position, 4);
        var result = this.dataView.getUint32(this.position);
        this.position += 4;
        return result;
    };

    ReadMessageType() {
        var value = this.ReadUint8();
        var returnType;
        for (var type in MessageType) {
            if (MessageType[type].value === value) {
                returnType = MessageType[type];
                break;
            }
        }
        return returnType;
    };

    static ProcessLogLine(message) {
        var id = message.ReadUint16();
        // ID is always 0 here, I think its the id of the console tab we should output to

        var text = message.ReadString();
        return text
    };

    static ProcessCommandInfo(message) {
        var name = message.ReadString();
        var argsLength = message.ReadUint16();
        var argsTypes = [];
        var argsNames = [];
        for (var i = 0; i < argsLength; i++) {
            argsTypes[i] = message.ReadString();
            argsNames[i] = message.ReadString();
        }
        var description = message.ReadString();
        // TODO: Do we care about any of this? we could potentially print out the list of discovered commands...
    };

    static Command(tabId, command) {
        var message = new NetworkMessage();
        message.WriteUint16(tabId);
        message.WriteString(command);
        message.Build(MessageType.Command);
        return message;
    };

    // For tests
    static LogLine(text) {
        var message = new NetworkMessage();
        message.WriteUint16(0);
        message.WriteString(text);
        message.Build(MessageType.LogLine);
        return message;
    }
}

export default {
    Soldat2Client, maybeGetLogLine, NetworkMessage, toBuffer
};
