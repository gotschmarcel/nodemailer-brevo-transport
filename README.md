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

## Options

```ts
type TransportOptions = { 
    apiKey: string;
    senderIP?: string;
}
```

### apiKey

Your Brevo API key. See this [help article](https://help.brevo.com/hc/en-us/articles/209467485-Create-and-manage-your-API-keys) for details how to create an API key.

### senderIP

An optional custom IP to be used for sending transactional emails.

## Inline Images

Embedding inline images requires the image to be hosted and available via an absolute URL. The image URL and size properties can be injected into the HTML content through parameters. Take a look at `test/manual/send-inline-image.js` for an example.

## License

**MIT**
