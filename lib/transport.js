"use strict";

const fs = require("node:fs");
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
    return new Promise(function (resolve, reject) {
        if (!util.isUndefined(attachment.raw)) {
            return reject(new Error("raw attachments not supported"));
        }
        if (!util.isString(attachment.filename)) {
            return reject(new Error("missing filename for attachment"));
        }

        if (util.isString(attachment.href)) {
            return resolve({
                url: attachment.href,
                name: attachment.filename,
            });
        }

        // Local file.
        if (util.isString(attachment.path)) {
            fs.readFile(attachment.path, function (err, data) {
                if (err) {
                    return reject(err);
                }
                resolve({
                    name: attachment.filename,
                    content: data.toString("base64"),
                });
            });
            return;
        }

        if (util.isString(attachment.content)) {
            return resolve({
                name: attachment.filename,
                content:
                    attachment.encoding === "base64"
                        ? attachment.content
                        : Buffer.from(
                              attachment.content,
                              attachment.encoding
                          ).toString("base64"),
            });
        }

        if (Buffer.isBuffer(attachment.content)) {
            return resolve({
                name: attachment.filename,
                content: attachment.content.toString("base64"),
            });
        }

        if (attachment.content instanceof stream.Readable) {
            var chunks = [];
            attachment.content
                .on("data", (chunk) => {
                    chunks.push(chunk);
                })
                .on("close", () => {
                    resolve({
                        name: attachment.filename,
                        content: Buffer.concat(chunks).toString("base64"),
                    });
                })
                .on("error", reject);
            return;
        }

        reject(new Error("unsupported attachment format"));
    });
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

        if (addresses.from.length !== 1) {
            throw new Error("multiple from addresses not supported");
        }

        return {
            sender: fixupAddresses(addresses.from)[0],
            to: fixupAddresses(addresses.to),
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
            templateId: mail.data.templateId,
            attachment:
                mail.data.attachments &&
                (await buildAttachements(mail.data.attachments)),
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
