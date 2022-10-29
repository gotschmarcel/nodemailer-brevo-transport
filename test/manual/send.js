"use strict";

const nodemailer = require("nodemailer");
const yargs = require("yargs");

const Transport = require("../../lib/transport");

// CLI
const args = yargs(process.argv.slice(2))
    .usage(
        "usage: $0 --apikey [key] --from [from] --to [to] --subject [subject] --plain [plain]"
    )
    .demandOption(["apikey", "from", "to", "subject", "plain"]).argv;

const transporter = nodemailer.createTransport(
    new Transport({ apiKey: args.apikey })
);
transporter.sendMail(
    {
        from: args.from,
        to: args.to,
        subject: args.subject,
        text: args.plain,
    },
    (err, info) => {
        if (err) {
            return console.error("Mail Error: ", err);
        }
        console.log("Mail Completed", info.messageId);
        console.dir(info.envelope);
    }
);
