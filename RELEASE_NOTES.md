# Release Notes

## v2.0.1

-   Fixes that sending a mail with an empty attachment array is rejected by Sendinblue

## v2.0.0

-   Support for Sendinblue v3
-   Templates
-   Dependency free

## v1.2.3

-   Missing apiKey option no longer causes an http exception

## v1.2.2 (v1.2.1)

-   Missing `promise` library was added to the package's dependencies

## v1.2.0

-   The option apiUrl now defaults to "https://api.sendinblue.com/v2.0"
-   Support for attachments added
-   Not having a `replyTo` address no longer causes an exception
-   Support for custom headers added
-   Response code and message added to info returned by nodemailer
-   Support for all nodemailer address types added (plain, named or object)

## v1.1.0

-   Fix `replyTo` addresses not working
-   `lodash` and `request` library dependencies removed

## v1.0.1

-   Fix code style issues

## v1.0.0

-   Initial release
-   No support for attachments yet
-   No support for object addresses yet
