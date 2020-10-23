const logger = require("../utils/logger")
const WebSocket = require('ws');

// const sslRootCAs = require('ssl-root-cas/latest')
// sslRootCAs.inject().addFile(__dirname + "/../certs/webrcon.com")

// TODO: For some reason we are unable to validate the webrcon.com certificate. I am not too sure
//  about how this should work, this is a temporary workaround. Above is a hint of what we should possibly be doing.
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

const WEBSOCKET_URL = 'wss://www.webrcon.com:8006'

class Soldat2Client {

    constructor() {
        this.ws = undefined
    }

    connect(sessionId, ckey) {
        const ws = new WebSocket(WEBSOCKET_URL);
        this.ws = ws;

        ws.on('open', function open() {
            logger.log.info(`WebSocket connection opened with ${WEBSOCKET_URL}`)
            let loginMessage = NetworkMessage.Login(sessionId, ckey)
            ws.send(loginMessage.raw);

        });

        // For debugging
        // ws.addListener("message", (data) =>
        //     console.log(data)
        // )
    }

    listenForServerResponse(processData,
                            callback = () => {
                            },
                            timeout = 7000) {

        const listener = (data) => {
            data = toArrayBuffer(data)
            const dataView = new DataView(data);
            const message = new NetworkMessage(dataView.buffer);
            const type = message.ReadMessageType();
            let eventText = undefined;

            if (type === MessageType.LogLine) {
                eventText = NetworkMessage.ProcessLogLine(message);
                logger.log.info(`Received active event from server: ${eventText.trim()}`)
                const result = processData(eventText)

                if (result !== undefined && result !== false) {
                    logger.log.info(`Got the data that we wanted: ${eventText}`)

                    this.ws.removeListener("message", listener)
                    callback(result)
                }
            }
        }

        this.ws.addListener("message", listener)

        // TODO: Currently this removal happens even if the data is found. The extra logging message is okay for now.
        setTimeout(() => {
            logger.log.info(`${timeout}ms has passed, removing listener.`)
            this.ws.removeListener("message", listener)
        }, timeout)
    }

    sendMessage(netMessage) {
        this.ws.send(netMessage.raw);
    }

    changeMap(mapName, gameMode, callback) {
        const message = NetworkMessage.Command(0, `loadmap ${mapName} ${gameMode}`)

        this.listenForServerResponse((text) => {
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
}

function toArrayBuffer(buf) {
    var ab = new ArrayBuffer(buf.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        view[i] = buf[i];
    }
    return ab;
}

// probably not needed, included for completeness
function toBuffer(ab) {
    var buf = Buffer.alloc(ab.byteLength);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buf.length; ++i) {
        buf[i] = view[i];
    }
    return buf;
}

MessageType = {
    Login: {value: 0xA0},
    SetState: {value: 0xA1},
    Error: {value: 0x02},
    LoginOk: {value: 0x03},
    NewTab: {value: 0x04},
    LogLine: {value: 0x06},
    Command: {value: 0x09},
    CommandInfo: {value: 0xA2},
    CloseTab: {value: 0xA3}
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
}

module.exports = {
    Soldat2Client, NetworkMessage, MessageType, toArrayBuffer
}
