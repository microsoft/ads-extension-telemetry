/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import TelemetryReporter, { TelemetryEventMeasures, TelemetryEventProperties } from "./telemetryReporter";

/**
 * A helper class to send an Action event with a duration, timer starts on construction and ends when send() is called.
 */
export class TimedAction<V extends string = string, A extends string = string> {
	/**
	 * Additional properties to send along with the final message once send is called.
	 */
	private properties: TelemetryEventProperties = {};
	/**
	 * Additional measures to send along with the final message once send is called.
	 */
	private measures: TelemetryEventMeasures = {};

	private start: number = Date.now();

	/**
	 * Creates a new TimedAction and sets the start time to Date.now().
	 * @param view The view this action originates from
	 * @param action The name of the action
	 * @param target The name of the item being acted on
	 * @param source The source of the action
	 */
	constructor(private reporter: TelemetryReporter,
		private view: V,
		private action: A,
		private target: string = '',
		private source: string = '') {
	}

	/**
	 * Adds additional custom properties to this event.
	 * @param additionalProperties The additional properties to add
	 */
	public withAdditionalProperties(additionalProperties: TelemetryEventProperties): TimedAction {
		Object.assign(this.properties, additionalProperties);
		return this;
	}

	/**
	 * Adds additional custom measurements to this event.
	 * @param additionalMeasurements The additional measurements to add
	 */
	public withAdditionalMeasures(additionalMeasurements: TelemetryEventMeasures): TimedAction {
		Object.assign(this.measures, additionalMeasurements);
		return this;
	}

	/**
	 * Sends the event with the duration being the difference between when this TimedAction was created and now.
	 */
	public send(): void {
		this.reporter.createActionEvent(this.view, this.action, this.source, this.target, Date.now() - this.start)
			.withAdditionalProperties(this.properties)
			.withAdditionalMeasurements(this.measures)
			.send();
	}
}