# ads-extension-telemetry

## Overview
This module provides a consistent way for first-party extensions to report telemetry over Application Insights.

The module respects the user's decision about whether or not to send telemetry data through the `telemetry.enableTelemetry` setting in Azure Data Studio.

Follow [guide to set up Application Insights](https://docs.microsoft.com/en-us/azure/application-insights/app-insights-nodejs-quick-start) in Azure and get your key.

## Installation
`npm install ads-extension-telemetry`

## Usage
 ```javascript
 const vscode = require('vscode');
 const TelemetryReporter = require('ads-extension-telemetry');

 // all events will be prefixed with this event name
 const extensionId = '<your extension unique name>';

 // extension version will be reported as a property with each event
 const extensionVersion = '<your extension version>';

 // the application insights key (also known as instrumentation key)
 const key = '<your key>';

// telemetry reporter
 let reporter;

 function activate(context: vscode.ExtensionContext) {
    ...
    // create telemetry reporter on extension activation
    reporter = new TelemetryReporter(extensionId, extensionVersion, key);
    // ensure it gets property disposed
    context.subscriptions.push(reporter);
    ...
 }

 function deactivate() {
   // This will ensure all pending events get flushed
    reporter.dispose();
 }

 ...
 // send event any time after activation

 // Immediately send event
 reporter.sendViewEvent('ConnectionDialog');
 reporter.sendActionEvent('ConnectionDialog', 'Click', 'OKButton', 'Mouse', 123);
 reporter.sendMetricsEvent({ 'dialogLoadTimeMs', 578 }, 'ConnectionDialog');
 reporter.sendErrorEvent('ConnectionDialog', 'connectionFailed', '4060', 'SqlException');

// Add on additional properties and then send event
reporter.createViewEvent('ConnectionDialog')
	.withAdditionalProperties( { myProp: 'MyPropValue' })
	.withAdditionalMeasurements( { myMeasure: 123 })
	.withConnectionInfo(connectionProfile)
	.send();
  ```

# common properties
- `common.extname`
- `common.extversion`
- `common.vscodemachineid`
- `common.vscodesessionid`
- `common.vscodeversion`
- `common.os`
- `common.platformversion`

## Releasing

Release a new version of the extension by:

1. Run `npm run release`
2. Run `git push --follow-tags origin main`
3. The release will be created in Github automatically by the CD pipeline, go to it and download the package artifact (tgz)
4. Run `npm publish <path to tarball>`

## License
[MIT](LICENSE)

## Data Collection

The software may collect information about you and your use of the software and send it to Microsoft. Microsoft may use this information to provide services and improve our products and services. You may turn off the telemetry as described in the repository. There are also some features in the software that may enable you and Microsoft to collect data from users of your applications. If you use these features, you must comply with applicable law, including providing appropriate notices to users of your applications together with a copy of Microsoft's privacy statement. Our privacy statement is located at https://go.microsoft.com/fwlink/?LinkID=824704. You can learn more about data collection and use in the help documentation and our privacy statement. Your use of the software operates as your consent to these practices.
