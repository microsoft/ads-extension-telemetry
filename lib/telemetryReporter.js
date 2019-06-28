/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_extension_telemetry_1 = require("vscode-extension-telemetry");
class TelemetryEventImpl {
    constructor(reporter, eventName, properties, measurements) {
        this.reporter = reporter;
        this.eventName = eventName;
        this.properties = properties;
        this.measurements = measurements;
        properties = properties || {};
        measurements = measurements || {};
    }
    send() {
        try {
            this.reporter.sendTelemetryEvent(this.eventName, this.properties, this.measurements);
        }
        catch (e) {
            // We don't want exceptions sending telemetry to break extensions so just log and ignore
            const msg = e instanceof Error ? e.message : e;
            console.error(`Error sending ${this.eventName} event ${msg}`);
        }
    }
    withAdditionalProperties(additionalProperties) {
        Object.assign(this.properties, additionalProperties);
        return this;
    }
    withAdditionalMeasurements(additionalMeasurements) {
        Object.assign(this.measurements, additionalMeasurements);
        return this;
    }
    withConnectionInfo(connectionInfo) {
        Object.assign(this.properties, {
            authenticationType: connectionInfo.authenticationType,
            providerName: connectionInfo.providerName,
            serverType: connectionInfo.serverType,
            engineType: connectionInfo.engineType
        });
        return this;
    }
}
class TelemetryReporter {
    constructor(extensionId, extensionVersion, key) {
        this._telemetryReporter = new vscode_extension_telemetry_1.default(extensionId, extensionVersion, key);
    }
    /**
     * Creates a View event that can be sent later. This is used to log that a particular page or item was seen.
     * @param view The name of the page or item that was viewed
     */
    createViewEvent(view) {
        return new TelemetryEventImpl(this._telemetryReporter, 'view', {
            view: view
        });
    }
    /**
     * Sends a View event. This is used to log that a particular page or item was seen.
     * @param view The name of the page or item that was viewed
     */
    sendViewEvent(view) {
        this.createViewEvent(view).send();
    }
    /**
     * Creates an Action event that can be sent later. This is used to log when an action was taken, such as clicking a button.
     * @param view The name of the page or item where this action occurred
     * @param action The name of the action taken
     * @param target The name of the item being acted on
     * @param source The source of the action
     */
    createActionEvent(view, action, target = '', source = '', durationInMs) {
        const measures = durationInMs ? { durationInMs: durationInMs } : {};
        return new TelemetryEventImpl(this._telemetryReporter, 'action', {
            view: view,
            action: action,
            target: target,
            source: source
        }, measures);
    }
    /**
     * Sends a Action event. This is used to log when an action was taken, such as clicking a button.
     * @param view The name of the page or item where this action occurred
     * @param action The name of the action taken
     * @param target The name of the item being acted on
     * @param source The source of the action
     */
    sendActionEvent(view, action, target = '', source = '', durationInMs) {
        this.createActionEvent(view, action, target, source, durationInMs).send();
    }
    /**
     * Creates a Metrics event that can be sent later. This is used to log measurements taken.
     * @param metrics The metrics to send
     */
    createMetricsEvent(metrics, groupName = '') {
        return new TelemetryEventImpl(this._telemetryReporter, 'metrics', { groupName: groupName }, metrics);
    }
    /**
     * Sends a Metrics event. This is used to log measurements taken.
     * @param measurements The metrics to send
     */
    sendMetricsEvent(metrics, groupName = '') {
        this.createMetricsEvent(metrics, groupName).send();
    }
    /**
     * Creates a new Error event that can be sent later. This is used to log errors that occur.
     * @param view The name of the page or item where the error occurred
     * @param name The friendly name of the error
     * @param errorCode The error code returned
     * @param errorType The specific type of error
     * @param properties Optional additional properties
     */
    createErrorEvent(view, name, errorCode = '', errorType = '') {
        return new TelemetryEventImpl(this._telemetryReporter, 'error', {
            view: view,
            name: name,
            errorCode: errorCode,
            errorType: errorType
        });
    }
    /**
     * Sends a Error event. This is used to log errors that occur.
     * @param view The name of the page or item where the error occurred
     * @param name The friendly name of the error
     * @param errorCode The error code returned
     * @param errorType The specific type of error
     */
    sendErrorEvent(view, name, errorCode = '', errorType = '') {
        this.createErrorEvent(view, name, errorCode, errorType).send();
    }
    /**
     * Creates a custom telemetry event with the specified name that can be sent later. Generally the other send functions should be
     * preferred over this - only use this if you absolutely need a custom event that can't be covered by the other methods.
     * @param eventName The name of the event. Will be prefixed with <extension-name>/
     * @param properties The list of properties to send along with the event
     * @param measurements The list of measurements to send along with the event
     */
    createTelemetryEvent(eventName, properties, measurements) {
        return new TelemetryEventImpl(this._telemetryReporter, eventName, properties, measurements);
    }
    /**
     * Sends a custom telemetry event with the specified name. Generally the other send functions should be
     * preferred over this - only use this if you absolutely need a custom event that can't be covered by the other
     * @param eventName The name of the event. Will be prefixed with <extension-name>/
     * @param properties The list of properties to send along with the event
     * @param measurements The list of measurements to send along with the event
     */
    sendTelemetryEvent(eventName, properties, measurements) {
        this.createTelemetryEvent(eventName, properties, measurements).send();
    }
    dispose() {
        return this._telemetryReporter.dispose();
    }
}
exports.default = TelemetryReporter;
//# sourceMappingURL=telemetryReporter.js.map