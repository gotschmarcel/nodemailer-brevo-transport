# Brevo Transport Module for Nodemailer

This module applies for [Nodemailer](http://www.nodemailer.com/) v6+ and provides a transport for [Brevo v3](https://www.brevo.com).

## Usage

Install with npm

    npm install nodemailer-brevo-transport

Require the module

```javascript
const nodemailer = require("nodemailer");
const Transport = require("nodemailer-brevo-transport");
```

Create a Nodemailer transporter

```javascript
const transporter = nodemailer.createTransport(
    new Transport({ apiKey: "my-api-key" })
);
```

## License

**MIT**
