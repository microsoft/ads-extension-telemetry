/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import type * as azdataType from 'azdata';
import VsCodeTelemetryReporter from '@vscode/extension-telemetry';

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

const commonProperties: TelemetryEventProperties = {}
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

export default class TelemetryReporter {

	private _telemetryReporter: VsCodeTelemetryReporter;

	constructor(extensionId: string, extensionVersion: string, key: string) {
		this._telemetryReporter = new VsCodeTelemetryReporter(extensionId, extensionVersion, key);
	}

	/**
	 * Creates a View event that can be sent later. This is used to log that a particular page or item was seen.
	 * @param view The name of the page or item that was viewed
	 */
	public createViewEvent(view: string): TelemetryEvent {
		return new TelemetryEventImpl(this._telemetryReporter, 'view', {
			view: view
		});
	}

	/**
	 * Sends a View event. This is used to log that a particular page or item was seen.
	 * @param view The name of the page or item that was viewed
	 */
	public sendViewEvent(view: string): void {
		this.createViewEvent(view).send();
	}

	/**
	 * Creates an Action event that can be sent later. This is used to log when an action was taken, such as clicking a button.
	 * @param view The name of the page or item where this action occurred
	 * @param action The name of the action taken
	 * @param target The name of the item being acted on
	 * @param source The source of the action
	 */
	public createActionEvent(view: string, action: string, target: string = '', source: string = '', durationInMs?: number): TelemetryEvent {
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
	 */
	public sendActionEvent(view: string, action: string, target: string = '', source: string = '', durationInMs?: number): void {
		this.createActionEvent(view, action, target, source, durationInMs).send();
	}

	/**
	 * Creates a Metrics event that can be sent later. This is used to log measurements taken.
	 * @param metrics The metrics to send
	 */
	public createMetricsEvent(metrics: TelemetryEventMeasures, groupName: string = ''): TelemetryEvent {
		return new TelemetryEventImpl(this._telemetryReporter, 'metrics', { groupName: groupName }, metrics);
	}

	/**
	 * Sends a Metrics event. This is used to log measurements taken.
	 * @param measurements The metrics to send
	 */
	public sendMetricsEvent(metrics: TelemetryEventMeasures, groupName: string = ''): void {
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
	public createErrorEvent(view: string, name: string, errorCode: string = '', errorType: string = ''): TelemetryEvent {
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
	public sendErrorEvent(view: string, name: string, errorCode: string = '', errorType: string = ''): void {
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
