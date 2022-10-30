# Sendinblue Transport Module for Nodemailer

This module applies for [Nodemailer](http://www.nodemailer.com/) v6+ and provides a transport for [Sendinblue v3](https://www.sendinblue.com).

## Usage

Install with npm

    npm install nodemailer-sendinblue-transport

Require the module

```javascript
const nodemailer = require("nodemailer");
const Transport = require("nodemailer-sendinblue-transport");
```

Create a Nodemailer transporter

```javascript
const transporter = nodemailer.createTransport(
    new Transport({ apiKey: "my-api-key" })
);
```

## License

**MIT**
