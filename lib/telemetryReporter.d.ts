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
export default class TelemetryReporter {
    private _telemetryReporter;
    constructor(extensionId: string, extensionVersion: string, key: string);
    /**
     * Creates a View event that can be sent later. This is used to log that a particular page or item was seen.
     * @param view The name of the page or item that was viewed
     */
    createViewEvent(view: string): TelemetryEvent;
    /**
     * Sends a View event. This is used to log that a particular page or item was seen.
     * @param view The name of the page or item that was viewed
     */
    sendViewEvent(view: string): void;
    /**
     * Creates an Action event that can be sent later. This is used to log when an action was taken, such as clicking a button.
     * @param view The name of the page or item where this action occurred
     * @param action The name of the action taken
     * @param target The name of the item being acted on
     * @param source The source of the action
     */
    createActionEvent(view: string, action: string, target?: string, source?: string, durationInMs?: number): TelemetryEvent;
    /**
     * Sends a Action event. This is used to log when an action was taken, such as clicking a button.
     * @param view The name of the page or item where this action occurred
     * @param action The name of the action taken
     * @param target The name of the item being acted on
     * @param source The source of the action
     */
    sendActionEvent(view: string, action: string, target?: string, source?: string, durationInMs?: number): void;
    /**
     * Creates a Metrics event that can be sent later. This is used to log measurements taken.
     * @param metrics The metrics to send
     */
    createMetricsEvent(metrics: TelemetryEventMeasures, groupName?: string): TelemetryEvent;
    /**
     * Sends a Metrics event. This is used to log measurements taken.
     * @param measurements The metrics to send
     */
    sendMetricsEvent(metrics: TelemetryEventMeasures, groupName?: string): void;
    /**
     * Creates a new Error event that can be sent later. This is used to log errors that occur.
     * @param view The name of the page or item where the error occurred
     * @param name The friendly name of the error
     * @param errorCode The error code returned
     * @param errorType The specific type of error
     * @param properties Optional additional properties
     */
    createErrorEvent(view: string, name: string, errorCode?: string, errorType?: string): TelemetryEvent;
    /**
     * Sends a Error event. This is used to log errors that occur.
     * @param view The name of the page or item where the error occurred
     * @param name The friendly name of the error
     * @param errorCode The error code returned
     * @param errorType The specific type of error
     */
    sendErrorEvent(view: string, name: string, errorCode?: string, errorType?: string): void;
    /**
     * Creates a custom telemetry event with the specified name that can be sent later. Generally the other send functions should be
     * preferred over this - only use this if you absolutely need a custom event that can't be covered by the other methods.
     * @param eventName The name of the event. Will be prefixed with <extension-name>/
     * @param properties The list of properties to send along with the event
     * @param measurements The list of measurements to send along with the event
     */
    createTelemetryEvent(eventName: string, properties?: TelemetryEventProperties, measurements?: TelemetryEventMeasures): TelemetryEvent;
    /**
     * Sends a custom telemetry event with the specified name. Generally the other send functions should be
     * preferred over this - only use this if you absolutely need a custom event that can't be covered by the other
     * @param eventName The name of the event. Will be prefixed with <extension-name>/
     * @param properties The list of properties to send along with the event
     * @param measurements The list of measurements to send along with the event
     */
    sendTelemetryEvent(eventName: string, properties?: TelemetryEventProperties, measurements?: TelemetryEventMeasures): void;
    dispose(): Promise<any>;
}
