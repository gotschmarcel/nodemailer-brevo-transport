"use strict";

const expect = require("chai").expect;
const fs = require("node:fs");
const nock = require("nock");
const nodemailer = require("nodemailer");

const Transport = require("../../lib/transport");

const API_URL = "https://api.brevo.com/v3/smtp/email";
const TEST_API_KEY = "test-api-key";
const RESPONSE_STATUS_SENT = 201;
const RESPONSE_STATUS_SCHEDULED = 202;
const ATTACHMENT_CONTENT = "Some Attachment Content";
const ATTACHMENT_CONTENT_BASE64 =
    Buffer.from(ATTACHMENT_CONTENT).toString("base64");

const BASIC_ENVELOPE_BODY = {
    sender: { email: "sender@test" },
    to: [{ email: "receiver@test" }],
    subject: "Test Subject",
    textContent: "Test Content",
};

const FULL_ENVELOPE_BODY = {
    ...BASIC_ENVELOPE_BODY,
    cc: [{ email: "cc1@test" }, { name: "CC2", email: "cc2@test" }],
    bcc: [{ email: "bcc1@test", name: "BCC1" }],
    replyTo: [{ email: "replyto@test" }],
    htmlContent: "<div>Test HTML Content</div>",
    params: { a: "value" },
    templateId: "some-templateId",
    tags: { a: "tag" },
    batchId: "5c6cfa04-eed9-42c2-8b5c-6d470d978e9d",
    attachment: [
        {
            name: "file.txt",
            content: ATTACHMENT_CONTENT_BASE64,
        },
        {
            name: "file2.txt",
            content: ATTACHMENT_CONTENT_BASE64,
        },
        {
            name: "file3.txt",
            content: ATTACHMENT_CONTENT_BASE64,
        },
        {
            name: "file4.txt",
            content: ATTACHMENT_CONTENT_BASE64,
        },
        {
            name: "file5.txt",
            url: "https://raw.github.com/nodemailer/nodemailer/master/LICENSE",
        },
        {
            name: "file6.txt",
            content: ATTACHMENT_CONTENT_BASE64,
        },
        {
            name: "file7.txt",
            content: ATTACHMENT_CONTENT_BASE64,
        },
    ],
};

const BASIC_ENVELOPE = {
    from: "sender@test",
    to: "receiver@test",
    subject: "Test Subject",
    text: "Test Content",
};

const full_envelope = () => ({
    ...BASIC_ENVELOPE,
    cc: "cc1@test, CC2 <cc2@test>",
    bcc: { address: "bcc1@test", name: "BCC1" },
    replyTo: "replyto@test",
    html: "<div>Test HTML Content</div>",
    params: { a: "value" },
    tags: { a: "tag" },
    batchId: "5c6cfa04-eed9-42c2-8b5c-6d470d978e9d",
    templateId: "some-templateId",
    attachments: [
        {
            // utf-8 string as an attachment
            filename: "file.txt",
            content: ATTACHMENT_CONTENT,
        },
        {
            // binary buffer as an attachment
            filename: "file2.txt",
            content: Buffer.from(ATTACHMENT_CONTENT, "utf-8"),
        },
        {
            // file on disk as an attachment
            filename: "file3.txt",
            path: `${__dirname}/data/file.txt`,
        },
        {
            // stream as an attachment
            filename: "file4.txt",
            content: fs.createReadStream(`${__dirname}/data/file.txt`),
        },
        {
            // use URL as an attachment
            filename: "file5.txt",
            href: "https://raw.github.com/nodemailer/nodemailer/master/LICENSE",
        },
        {
            // encoded string as an attachment
            filename: "file6.txt",
            content: Buffer.from(ATTACHMENT_CONTENT).toString("hex"),
            encoding: "hex",
        },
        {
            // encoded string as an attachment
            filename: "file7.txt",
            content: ATTACHMENT_CONTENT_BASE64,
            encoding: "base64",
        },
    ],
});

function expectRequest({ body, customHeaders, replyCode, replyBody }) {
    nock(API_URL, {
        reqheaders: {
            "content-type": "application/json",
            accept: "application/json",
            "api-key": TEST_API_KEY,
            ...customHeaders,
        },
    })
        .post("", body)
        .reply(replyCode ?? RESPONSE_STATUS_SENT, replyBody);
}

describe("Transport", function () {
    const transporter = nodemailer.createTransport(
        new Transport({ apiKey: TEST_API_KEY })
    );

    before(function () {
        // disable internet access to ensure we are stubbing all reqs
        nock.disableNetConnect();
    });

    it("basic mail", function (done) {
        expectRequest({
            body: FULL_ENVELOPE_BODY,
        });

        transporter.sendMail(full_envelope(), (err, info) => {
            if (err) {
                return done(err);
            }

            expect(info).to.have.property("messageId");
            expect(info.envelope).to.have.property("from");
            expect(info.envelope).to.have.property("to");
            done();
        });
    });

    it("scheduled response", function (done) {
        expectRequest({ replyCode: RESPONSE_STATUS_SCHEDULED });

        transporter.sendMail(full_envelope(), (err, info) => {
            if (err) {
                return done(err);
            }

            expect(info).to.have.property("messageId");
            done();
        });
    });

    it("error response", function (done) {
        expectRequest({
            replyCode: 400,
            replyBody: { message: "some error message", code: "some_code" },
        });

        transporter.sendMail(full_envelope(), (err) => {
            expect(err).to.be.an("error");
            expect(err.message).to.contain("some error message");
            expect(err.message).to.contain("some_code");
            done();
        });
    });

    it("error response with missing fields", function (done) {
        expectRequest({ replyCode: 400, replyBody: {} });

        transporter.sendMail(full_envelope(), (err) => {
            expect(err).to.be.an("error");
            expect(err.message).to.contain("invalid response");
            expect(err.message).to.contain("undefined");
            done();
        });
    });

    it("invalid error response", function (done) {
        expectRequest({ replyCode: 400 });

        transporter.sendMail(full_envelope(), (err) => {
            expect(err).to.be.an("error");
            expect(err.message).to.contain("invalid response");
            expect(err.message).to.contain("undefined");
            done();
        });
    });

    it("multiple senders", function (done) {
        transporter.sendMail(
            {
                ...full_envelope(),
                from: "sender1@test, sender2@test",
            },
            (err) => {
                expect(err).to.be.an("error");
                expect(err.message).to.contain("multiple from");
                done();
            }
        );
    });

    it("template", function (done) {
        expectRequest({
            templateId: 2,
            to: ["receiver@test"],
        });

        transporter.sendMail(
            {
                templateId: 2,
                to: "receiver@test",
            },
            (err) => {
                if (err) {
                    return done(err);
                }
                done();
            }
        );
    });

    it("missing fields", function (done) {
        expectRequest({});

        transporter.sendMail({}, (err) => {
            if (err) {
                return done(err);
            }
            done();
        });
    });

    it("empty attachments", function (done) {
        expectRequest({
            body: BASIC_ENVELOPE_BODY,
        });

        transporter.sendMail(
            {
                ...BASIC_ENVELOPE,
                attachments: [],
            },
            (err) => {
                if (err) {
                    return done(err);
                }
                done();
            }
        );
    });

    [
        {
            attachment: { path: `${__dirname}/data/file.txt` },
            error: "missing filename",
        },
        {
            attachment: {
                filename: "file",
                path: `${__dirname}/data/doesnotexist`,
            },
            error: "no such file",
        },
        {
            attachment: { raw: "Raw Content" },
            error: "not supported",
        },
        {
            attachment: { filename: "file" },
            error: "unsupported attachment",
        },
    ].forEach(function (data, index) {
        it(`invalid attachment (${index})`, function (done) {
            transporter.sendMail(
                {
                    ...full_envelope(),
                    attachments: [data.attachment],
                },
                (err) => {
                    expect(err).to.be.an("error");
                    expect(err.message).to.contain(data.error);
                    done();
                }
            );
        });
    });
});
