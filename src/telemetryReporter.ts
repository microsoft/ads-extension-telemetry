/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

import VsCodeTelemetryReporter from 'vscode-extension-telemetry';

export interface TelemetryEventProperties {
	[key: string]: string;
}

export interface TelemetryEventMeasures {
	[key: string]: number;
}

export default class TelemetryReporter {

	private _telemetryReporter: VsCodeTelemetryReporter;

	constructor(extensionId: string, extensionVersion: string, key: string) {
		this._telemetryReporter = new VsCodeTelemetryReporter(extensionId, extensionVersion, key);
	}

	/**
	 * Sends a View event. This is used to log that a particular page or item was seen.
	 * @param view The name of the page or item that was viewed
	 * @param properties Optional additional properties
	 */
	public sendViewEvent(view: string, properties?: TelemetryEventProperties) {
		try {
			this._telemetryReporter.sendTelemetryEvent('view',
				{
					'view': view,
					...properties
				}
			);
		}
		catch (e) {
			// We don't want exceptions sending telemetry to break extensions so just log and ignore
			const msg = e instanceof Error ? e.message : e;
			console.error(`Error sending action event ${msg}`);
		}

	}

	/**
	 * Sends a Action event. This is used to log when an action was taken, such as clicking a button.
	 * @param view The name of the page or item where this action occurred
	 * @param action The name of the action taken
	 * @param target The name of the item being acted on
	 * @param source The source of the action
	 * @param properties Optional additional properties
	 */
	public sendActionEvent(view: string, action: string, target: string = '', source: string = '', properties?: TelemetryEventProperties) {
		try {
			this._telemetryReporter.sendTelemetryEvent('action',
				{
					'view': view,
					'action': action,
					'target': target,
					'source': source,
					...properties
				}
			);
		}
		catch (e) {
			// We don't want exceptions sending telemetry to break extensions so just log and ignore
			const msg = e instanceof Error ? e.message : e;
			console.error(`Error sending action event ${msg}`);
		}
	}

	/**
	 * Sends a Metrics event. This is used to log measurements taken.
	 * @param measurements
	 */
	public sendMetricsEvent(measurements: TelemetryEventMeasures) {
		try {
			this._telemetryReporter.sendTelemetryEvent('metrics', undefined, { ...measurements });
		}
		catch (e) {
			// We don't want exceptions sending telemetry to break extensions so just log and ignore
			const msg = e instanceof Error ? e.message : e;
			console.error(`Error sending action event ${msg}`);
		}
	}

	/**
	 * Sends a Error event. This is used to log errors that occur.
	 * @param view The name of the page or item where the error occurred
	 * @param name The friendly name of the error
	 * @param errorCode The error code returned
	 * @param errorType The specific type of error
	 * @param properties Optional additional properties
	 */
	public sendErrorEvent(view: string, name: string, errorCode: string = '', errorType: string = '', properties?: TelemetryEventProperties) {
		try {
			this._telemetryReporter.sendTelemetryEvent('error',
				{
					'view': view,
					'name': name,
					'errorCode': errorCode,
					'errorType': errorType,
					...properties
				}
			);
		}
		catch (e) {
			// We don't want exceptions sending telemetry to break extensions so just log and ignore
			const msg = e instanceof Error ? e.message : e;
			console.error(`Error sending action event ${msg}`);
		}
	}

	/**
	 * Sends a custom telemetry event with the specified name. Generally the other send functions should be
	 * preferred over this - only use this if you absolutely need a custom event that can't be covered by the other
	 * @param eventName The name of the event. Will be prefixed with <extension-name>/
	 * @param properties The list of properties to send along with the event
	 * @param measurements The list of measurements to send along with the event
	 */
	public sendTelemetryEvent(eventName: string, properties?: TelemetryEventProperties, measurements?: TelemetryEventMeasures) {
		try {
			this._telemetryReporter.sendTelemetryEvent(eventName, properties, measurements);
		}
		catch (e) {
			// We don't want exceptions sending telemetry to break extensions so just log and ignore
			const msg = e instanceof Error ? e.message : e;
			console.error(`Error sending action event ${msg}`);
		}
	}

	public dispose(): Promise<any> {
		return this._telemetryReporter.dispose();
	}
}
