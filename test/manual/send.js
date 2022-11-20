"use strict";

const nodemailer = require("nodemailer");
const yargs = require("yargs");

const Transport = require("../../lib/transport");

// CLI
const args = yargs(process.argv.slice(2))
    .usage(
        "usage: $0 --apikey [key] --to [to] --from [from] --attachment --template"
    )
    .demandOption(["apikey", "to"]).argv;

const transporter = nodemailer.createTransport(
    new Transport({ apiKey: args.apikey })
);

const envelope = args.template
    ? {
          templateId: 2,
          to: args.to,
      }
    : {
          from: args.from,
          to: args.to,
          subject: "Manual Test",
          // text: "Manual Test",
          html: "<strong>Manual Test</strong>",
          attachments: args.attachment
              ? [
                    {
                        filename: "File.txt",
                        content: "Some File Content",
                    },
                ]
              : [],
      };

transporter.sendMail(envelope, (err, info) => {
    if (err) {
        return console.error("Mail Error: ", err);
    }
    console.log("Mail Completed", info.messageId);
    console.dir(info.envelope);
});
