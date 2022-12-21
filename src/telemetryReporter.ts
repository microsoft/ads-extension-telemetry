/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import type * as azdataType from 'azdata';
import VsCodeTelemetryReporter from '@vscode/extension-telemetry';
import { TimedAction } from './timedAction';

/**
 * Holds additional properties to send along with an event.
 */
export interface TelemetryEventProperties {
	[key: string]: string;
}

/**
 * Holds additional measures to send along with an event.
 */
export interface TelemetryEventMeasures {
	[key: string]: number;
}

/**
 * Connection info properties to add into an event.
 */
export interface TelemetryConnectionInfo {
	authenticationType?: string;
	providerName?: string;
	serverType?: string;
	engineType?: string;
	// If adding new fields here make sure to update withConnectionInfo below with the new fields
}

/**
 * A telemetry event which can be sent at a later time.
 */
export interface TelemetryEvent {
	/**
	 * Sends the event
	 */
	send(): void;

	/**
	 * Adds additional custom properties to this event.
	 * @param additionalProperties The additional properties to add
	 */
	withAdditionalProperties(additionalProperties: TelemetryEventProperties): TelemetryEvent;

	/**
	 * Adds additional custom measurements to this event.
	 * @param additionalMeasurements The additional measurements to add
	 */
	withAdditionalMeasurements(additionalMeasurements: TelemetryEventMeasures): TelemetryEvent;

	/**
	 * Adds additional connection-related information to this event.
	 * @param connectionInfo The connection info to add. Only the fields in TelemetryConnectionInfo are included, all others are ignored.
	 */
	withConnectionInfo(connectionInfo: TelemetryConnectionInfo): TelemetryEvent;
}

/**
 * List of domain names that we use to determine if a user is internal to Microsoft.
 */
const msftInternalDomains = [
    "redmond.corp.microsoft.com",
    "northamerica.corp.microsoft.com",
    "fareast.corp.microsoft.com",
    "ntdev.corp.microsoft.com",
    "wingroup.corp.microsoft.com",
    "southpacific.corp.microsoft.com",
    "wingroup.windeploy.ntdev.microsoft.com",
    "ddnet.microsoft.com",
    "europe.corp.microsoft.com"
];

/**
 * Attempts to determine whether this machine is an MSFT internal user. This is not 100% accurate and isn't
 * meant to be, but is good enough for our cases.
 * @returns true if internal, false otherwise
 */
function isMsftInternal(): boolean {
    // Original logic from https://github.com/Microsoft/azuredatastudio/blob/9a14fef8075965f62c2d4efdfa1a30bf6ddddcf9/src/vs/platform/telemetry/common/telemetryUtils.ts#L260
    // This is a best-effort guess using the DNS domain for the user
	const userDnsDomain = process.env['USERDNSDOMAIN'];
	if (!userDnsDomain) {
		return false;
	}

	const domain = userDnsDomain.toLowerCase();
	return msftInternalDomains.some(msftDomain => domain === msftDomain);
}

const commonMeasurements: TelemetryEventMeasures = {
    // Use a number since that's what ADS core uses.
    // NOTE: We do NOT set the UTC flag like core
    // (https://github.com/Microsoft/azuredatastudio/blob/9a14fef8075965f62c2d4efdfa1a30bf6ddddcf9/src/vs/platform/telemetry/common/1dsAppender.ts#L53)
    // since we don't have direct access to the internal appender instance and currently the package
    // only sets that flag is "telemetry.internalTesting" is true
    // https://github.com/microsoft/vscode-extension-telemetry/blob/04e50fbc94a922f5e2ee6eb2cf2236491f1f99d9/src/common/1dsClientFactory.ts#L52
    'common.msftInternal': isMsftInternal() ? 1 : 0
}

const commonProperties: TelemetryEventProperties = { }

try {
	const azdata: typeof azdataType = require('azdata');
	commonProperties['common.adsversion'] = azdata?.version
} catch (err) {
	// no-op when we're not in a context that has azdata available
}




class TelemetryEventImpl implements TelemetryEvent {
	constructor(
		private reporter: VsCodeTelemetryReporter,
		private eventName: string,
		private properties?: TelemetryEventProperties,
		private measurements?: TelemetryEventMeasures) {
		this.properties = properties || {};
		Object.assign(this.properties, commonProperties);
        this.measurements = measurements || {};
        Object.assign(this.measurements, commonMeasurements);
	}

	public send(): void {
		try {
			this.reporter.sendTelemetryEvent(this.eventName, this.properties, this.measurements);
		}
		catch (e) {
			// We don't want exceptions sending telemetry to break extensions so just log and ignore
			const msg = e instanceof Error ? e.message : e;
			console.error(`Error sending ${this.eventName} event ${msg}`);
		}
	}

	public withAdditionalProperties(additionalProperties: TelemetryEventProperties): TelemetryEvent {
		Object.assign(this.properties!, additionalProperties);
		return this;
	}

	public withAdditionalMeasurements(additionalMeasurements: TelemetryEventMeasures): TelemetryEvent {
		Object.assign(this.measurements!, additionalMeasurements);
		return this;
	}

	public withConnectionInfo(connectionInfo: TelemetryConnectionInfo): TelemetryEvent {
		Object.assign(this.properties!,
			{
				authenticationType: connectionInfo.authenticationType,
				providerName: connectionInfo.providerName,
				serverType: connectionInfo.serverType,
				engineType: connectionInfo.engineType
			});
		return this;
	}
}

export default class TelemetryReporter<V extends string = string, A extends string = string> {

	private _telemetryReporter: VsCodeTelemetryReporter;

	/**
	 *
	 * @param extensionId The ID of the extension sending the event
	 * @param extensionVersion The version of the extension sending the event
	 * @param key The AI Key to use
	 */
	constructor(extensionId: string, extensionVersion: string, key: string) {
		this._telemetryReporter = new VsCodeTelemetryReporter(extensionId, extensionVersion, key);
	}

	/**
	 * Creates a View event that can be sent later. This is used to log that a particular page or item was seen.
	 * @param view The name of the page or item that was viewed
	 */
	public createViewEvent(view: V): TelemetryEvent {
		return new TelemetryEventImpl(this._telemetryReporter, 'view', {
			view: view
		});
	}

	/**
	 * Sends a View event. This is used to log that a particular page or item was seen.
	 * @param view The name of the page or item that was viewed
	 */
	public sendViewEvent(view: V): void {
		this.createViewEvent(view).send();
	}

	/**
	 * Creates an Action event that can be sent later. This is used to log when an action was taken, such as clicking a button.
	 * @param view The name of the page or item where this action occurred
	 * @param action The name of the action taken
	 * @param target The name of the item being acted on
	 * @param source The source of the action
	 * @param durationInMs The duration the action took to execute
	 */
	public createActionEvent(view: V, action: A, target: string = '', source: string = '', durationInMs?: number): TelemetryEvent {
		const measures: TelemetryEventMeasures = durationInMs ? { durationInMs: durationInMs } : {};
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
	 * @param durationInMs The duration the action took to execute
	 */
	public sendActionEvent(view: V, action: A, target: string = '', source: string = '', durationInMs?: number): void {
		this.createActionEvent(view, action, target, source, durationInMs).send();
	}

	/**
	 * Creates a TimedAction - which will create and send an action event with a duration when send() is called. The timer
	 * starts on construction and ends when send() is called.
	 * @param view The view this action originates from
	 * @param action The name of the action
	 * @param target The name of the item being acted on
	 * @param source The source of the action
	 * @returns The TimedAction object
	 */
	public createTimedAction(view: V, action: A, target?: string, source?: string): TimedAction {
		return new TimedAction(this, view, action, target, source)
	}

	/**
	 * Creates a Metrics event that can be sent later. This is used to log measurements taken.
	 * @param measurements The metrics to send
	 * @param groupName The name of the group these measurements belong to
	 */
	public createMetricsEvent(measurements: TelemetryEventMeasures, groupName: string = ''): TelemetryEvent {
		return new TelemetryEventImpl(this._telemetryReporter, 'metrics', { groupName: groupName }, measurements);
	}

	/**
	 * Sends a Metrics event. This is used to log measurements taken.
	 * @param measurements The measurements to send
	 * @param groupName The name of the group these measurements belong to
	 */
	public sendMetricsEvent(measurements: TelemetryEventMeasures, groupName: string = ''): void {
		this.createMetricsEvent(measurements, groupName).send();
	}

	/**
	 * Creates a new Error event that can be sent later. This is used to log errors that occur.
	 * @param view The name of the page or item where the error occurred
	 * @param name The friendly name of the error
	 * @param errorCode The error code returned
	 * @param errorType The specific type of error
	 */
	public createErrorEvent(view: V, name: string, errorCode: string = '', errorType: string = ''): TelemetryEvent {
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
	public sendErrorEvent(view: V, name: string, errorCode: string = '', errorType: string = ''): void {
		this.createErrorEvent(view, name, errorCode, errorType).send();
	}

	/**
	 * Creates a custom telemetry event with the specified name that can be sent later. Generally the other send functions should be
	 * preferred over this - only use this if you absolutely need a custom event that can't be covered by the other methods.
	 * @param eventName The name of the event. Will be prefixed with <extension-name>/
	 * @param properties The list of properties to send along with the event
	 * @param measurements The list of measurements to send along with the event
	 */
	public createTelemetryEvent(eventName: string, properties?: TelemetryEventProperties, measurements?: TelemetryEventMeasures): TelemetryEvent {
		return new TelemetryEventImpl(this._telemetryReporter, eventName, properties, measurements);
	}

	/**
	 * Sends a custom telemetry event with the specified name. Generally the other send functions should be
	 * preferred over this - only use this if you absolutely need a custom event that can't be covered by the other
	 * @param eventName The name of the event. Will be prefixed with <extension-name>/
	 * @param properties The list of properties to send along with the event
	 * @param measurements The list of measurements to send along with the event
	 */
	public sendTelemetryEvent(eventName: string, properties?: TelemetryEventProperties, measurements?: TelemetryEventMeasures): void {
		this.createTelemetryEvent(eventName, properties, measurements).send();
	}

	public dispose(): Promise<any> {
		return this._telemetryReporter.dispose();
	}
}
