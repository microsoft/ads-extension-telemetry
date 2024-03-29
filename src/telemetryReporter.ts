/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import type * as azdataType from 'azdata';
import VsCodeTelemetryReporter from '@vscode/extension-telemetry';
import { TimedAction } from './timedAction';

/**
 * Subset of azdata.IConnectionProfile properties to be sent as telemetry properties
 */
export type ConnectionInfo = Partial<Pick<azdataType.IConnectionProfile, 'authenticationType' | 'providerName'>>;

/**
 * Subset of azdata.ServerInfo properties to be sent as telemetry properties
 */
export type ServerInfo = Partial<Pick<azdataType.ServerInfo, 'isCloud' | 'serverVersion' | 'serverEdition' | 'engineEditionId'>>;

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
	 * @param connectionInfo The connection info to add.
	 */
	withConnectionInfo(connectionInfo: ConnectionInfo): TelemetryEvent;

	/**
	 * Adds additional server-related information to this event.
	 * @param serverInfo The server info to add.
	 */
	withServerInfo(serverInfo: ServerInfo): TelemetryEvent;
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

const commonProperties: TelemetryEventProperties = {}

try {
	const azdata: typeof azdataType = require('azdata');
	commonProperties['common.adsversion'] = azdata?.version
} catch (err) {
	// no-op when we're not in a context that has azdata available
}




class TelemetryEventImpl implements TelemetryEvent {
	constructor(
		private reporter: VsCodeTelemetryReporter | undefined,
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
			this.reporter?.sendTelemetryEvent(this.eventName, this.properties, this.measurements);
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

	public withConnectionInfo(connectionInfo: ConnectionInfo): TelemetryEvent {
		// IMPORTANT - If making changes here the same changes should generally be made in the AdsTelemetryService version as well

		// Safeguard against invalid objects being passed in
		if (typeof connectionInfo === 'object') {
			Object.assign(this.properties!,
				{
					authenticationType: connectionInfo.authenticationType,
					providerName: connectionInfo.providerName
				});
		} else {
			console.error(`AdsTelemetryReporter received invalid ConnectionInfo object of type ${typeof connectionInfo}`)
		}
		return this;
	}

	public withServerInfo(serverInfo: ServerInfo): TelemetryEvent {
		// IMPORTANT - If making changes here the same changes should generally be made in the AdsTelemetryService version as well

		// Safeguard against invalid objects being passed in
		if (typeof serverInfo === 'object') {
			Object.assign(this.properties!,
				{
					connectionType: serverInfo.isCloud !== undefined ? (serverInfo.isCloud ? 'Azure' : 'Standalone') : '',
					serverVersion: serverInfo.serverVersion ?? '',
					serverEdition: serverInfo.serverEdition ?? '',
					serverEngineEdition: serverInfo.engineEditionId ?? ''
				});
		} else {
			console.error(`AdsTelemetryReporter received invalid ServerInfo object of type ${typeof serverInfo}`)
		}
		return this;
	}
}

export default class TelemetryReporter<V extends string = string, A extends string = string> {

	private _telemetryReporter: VsCodeTelemetryReporter | undefined = undefined;

	/**
	 *
	 * @param extensionId The ID of the extension sending the event
	 * @param extensionVersion The version of the extension sending the event
	 * @param key The AI Key to use
	 */
	constructor(extensionId: string, extensionVersion: string, key: string) {
		// Try to initialize the reporter, but don't throw if it fails so we don't break the extension
		try {
			this._telemetryReporter = new VsCodeTelemetryReporter(extensionId, extensionVersion, key);
		} catch (e) {
			console.error(`Error initializing TelemetryReporter for '${extensionId}'. ${(e as Error)?.message ?? e}`);
		}
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
	 * @deprecated Use createErrorEvent2
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
	 * @deprecated Use sendErrorEvent2
	 */
	public sendErrorEvent(view: V, name: string, errorCode: string = '', errorType: string = ''): void {
		this.createErrorEvent(view, name, errorCode, errorType).send();
	}

	/**
	 * Creates a new Error event that can be sent later. This is used to log errors that occur.
	 * @param view The name of the page or item where the error occurred
	 * @param name The friendly name of the error
	 * @param error The error. If an Error object the message and stack will be extracted and added to the event, otherwise the message will be set to error.toString()
	 * @param includeMessage Whether the error message is included. This can often contain sensitive information, so by default is false. Only set to true if you're absolutely sure there will be no sensitive information included.
	 * @param errorCode The error code returned, default is empty
	 * @param errorType The specific type of error, default is empty
	 */
	public createErrorEvent2(view: V, name: string, error: any = undefined, includeMessage: boolean = false, errorCode: string = '', errorType: string = ''): TelemetryEvent {
		const props: TelemetryEventProperties = {
			view: view,
			name: name,
			errorCode: errorCode,
			errorType: errorType
		};
		if (error instanceof Error) {
			props.message = includeMessage === true ? error.message : '';
			let stack = error.stack || '';
			// Stack trace contains the message, so remove it if we aren't set to include it
			if (includeMessage !== true && error.message) {
				const regex = new RegExp(error.message, 'g');
				stack = stack.replace(regex, '<REDACTED: error-message>')
			}
			props.stack = stack;
		} else {
			props.message = includeMessage === true ? error?.toString() : '';
			props.stack = '';
		}
		return new TelemetryEventImpl(this._telemetryReporter, 'error', props);
	}

	/**
	 * Sends a Error event. This is used to log errors that occur.
	 * @param view The name of the page or item where the error occurred
	 * @param name The friendly name of the error
	 * @param error The error object. If an Error object the message and stack will be extracted and added to the event, otherwise the message will be set to error.toString()
	 * @param includeMessage Whether the error message is included. This can often contain sensitive information, so by default is false. Only set to true if you're absolutely sure there will be no sensitive information included.
	 * @param errorCode The error code returned
	 * @param errorType The specific type of error
	 */
	public sendErrorEvent2(view: V, name: string, error: any = undefined, includeMessage: boolean = false, errorCode: string = '', errorType: string = ''): void {
		this.createErrorEvent2(view, name, error, includeMessage, errorCode, errorType).send();
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

	/**
	 * Disposes of the telemetry reporter. This flushes the remaining events and disposes of the telemetry client.
	 */
	public async dispose(): Promise<void> {
		await this._telemetryReporter?.dispose();
	}
}
