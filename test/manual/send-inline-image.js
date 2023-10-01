"use strict";

const nodemailer = require("nodemailer");
const yargs = require("yargs");

const Transport = require("../../lib/transport");

// CLI
const args = yargs(process.argv.slice(2))
    .usage(
        "usage: $0 --apikey [key] --to [to] --from [from] --imageurl [url] --imagesize [size]"
    )
    .demandOption(["apikey", "to", "from", "imageurl"]).argv;

const transporter = nodemailer.createTransport(
    new Transport({ apiKey: args.apikey })
);

const [imageWidth, imageHeight] = (() => {
    if (!args.imagesize) {
        return ["400", "400"];
    }
    return args.imagesize.split("x");
})();

transporter.sendMail(
    {
        to: args.to,
        from: args.from,
        subject: "Embedded Images",
        html: `Embedded image: <img src={{params.IMAGE_URL}} alt='logo' width={{params.IMAGE_WIDTH}} height={{params.IMAGE_HEIGHT}}/>`,
        params: {
            IMAGE_URL: args.imageurl,
            IMAGE_WIDTH: imageWidth,
            IMAGE_HEIGHT: imageHeight,
        },
    },
    (err, info) => {
        if (err) {
            return console.error("Mail Error: ", err);
        }
        console.log("Mail Completed", info.messageId);
        console.dir(info.envelope);
    }
);
