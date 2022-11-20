"use strict";

const fs = require("node:fs/promises");
const http = require("node:http");
const https = require("node:https");
const stream = require("node:stream");
const url = require("node:url");

const pkg = require("../package.json");

const util = require("./util");

function responseErrorMessage(res, body) {
    return `${body.message || "invalid response"} (code: ${
        body.code
    }, statusCode: ${res.statusCode})`;
}

// Reads all data of 'readable' into a Buffer.
// Params:
//   - readable: stream.Readable
// Returns: Buffer
async function readAll(readable) {
    console.assert(readable instanceof stream.Readable);
    let chunks = [];
    for await (const chunk of readable) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

// Removes empty 'name' fields and moves the 'address' field into
// 'email' to be compliant with the sendinblue API.
function fixupAddresses(addresses) {
    return addresses.map((address) => {
        return {
            // Sendinblue wants the address under the 'email' key.
            email: address.address,

            // An empty name field is not allowed.
            name: !util.isEmptyString(address.name) ? address.name : undefined,
        };
    });
}

async function buildAttachment(attachment) {
    if (!util.isUndefined(attachment.raw)) {
        throw new Error("raw attachments not supported");
    }
    if (!util.isString(attachment.filename)) {
        throw new Error("missing filename for attachment");
    }

    if (util.isString(attachment.href)) {
        return {
            url: attachment.href,
            name: attachment.filename,
        };
    }

    // Local file.
    if (util.isString(attachment.path)) {
        const content = await fs.readFile(attachment.path);
        return {
            name: attachment.filename,
            content: content.toString("base64"),
        };
    }

    if (util.isString(attachment.content)) {
        return {
            name: attachment.filename,
            content:
                attachment.encoding === "base64"
                    ? attachment.content
                    : Buffer.from(
                          attachment.content,
                          attachment.encoding
                      ).toString("base64"),
        };
    }

    if (Buffer.isBuffer(attachment.content)) {
        return {
            name: attachment.filename,
            content: attachment.content.toString("base64"),
        };
    }

    if (attachment.content instanceof stream.Readable) {
        return {
            name: attachment.filename,
            content: (await readAll(attachment.content)).toString("base64"),
        };
    }

    throw new Error("unsupported attachment format");
}

async function buildAttachements(attachments) {
    return await Promise.all(attachments.map((a) => buildAttachment(a)));
}

class Transport {
    constructor({ apiKey }) {
        this.name = pkg.name;
        this.version = pkg.version;
        this.apiKey = apiKey;
        this.apiURL = new url.URL("https://api.sendinblue.com/v3/smtp/email");
        this.request =
            this.apiURL.protocol === "https:" ? https.request : http.request;
    }

    send(mail, callback) {
        this.buildBody(mail)
            .then((body) => {
                return this.sendRequest(mail, body);
            })
            .then((info) => {
                callback(null, info);
            })
            .catch(callback);
    }

    async buildBody(mail) {
        const addresses = mail.message.getAddresses();

        if (!util.isUndefined(addresses.from) && addresses.from.length !== 1) {
            throw new Error("multiple from addresses not supported");
        }

        return {
            sender:
                !util.isUndefined(addresses.from) &&
                fixupAddresses(addresses.from)[0],
            to: addresses.to && fixupAddresses(addresses.to),
            cc: addresses.cc && fixupAddresses(addresses.cc),
            bcc: addresses.bcc && fixupAddresses(addresses.bcc),
            replyTo:
                addresses["reply-to"] && fixupAddresses(addresses["reply-to"]),
            subject: mail.data.subject,
            textContent: mail.data.text,
            htmlContent: mail.data.html,
            // An empty headers object will be rejected, so omit if necessary.
            headers: !util.isEmptyObject(mail.data.headers)
                ? mail.data.headers
                : undefined,
            params: mail.data.params,
            tags: mail.data.tags,
            batchId: mail.data.batchId,
            templateId: mail.data.templateId,
            // An empty array will be rejected, so omit if necessary.
            attachment:
                util.isArray(mail.data.attachments) &&
                mail.data.attachments.length > 0
                    ? await buildAttachements(mail.data.attachments)
                    : undefined,
        };
    }

    sendRequest(mail, body) {
        return new Promise((resolve, reject) => {
            const envelope = mail.data.envelope || mail.message.getEnvelope();
            const messageId = mail.message.messageId();

            const req = this.request(
                this.apiURL,
                {
                    method: "POST",
                    headers: {
                        "api-key": this.apiKey,
                        "content-type": "application/json",
                        accept: "application/json",
                    },
                },
                (res) => {
                    res.setEncoding("utf-8");

                    let chunks = [];
                    res.on("data", (data) => {
                        chunks.push(data);
                    }).on("end", () => {
                        let body = {};
                        try {
                            let data = chunks.join("");
                            body = JSON.parse(data);
                        } catch (err) {
                            /* Ignore error */
                        }

                        if (res.statusCode >= 400) {
                            return reject(
                                new Error(responseErrorMessage(res, body))
                            );
                        }

                        resolve({
                            messageId,
                            envelope,
                        });
                    });
                }
            );

            req.on("error", reject);
            req.write(JSON.stringify(body));
            req.end();
        });
    }
}

module.exports = Transport;
