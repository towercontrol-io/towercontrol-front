/**
 * Defines how an alert fires and terminates.
 */
export type AlertBehavior = 'FIRE_FORGET' | 'FIRE_TO_END' | 'FIRE_UNTIL' | 'SILENT';

/**
 * Notification channels available for alert messages.
 * Individual mediums (EMAIL, SMS, PUSH, WHATSAPP) are delivered per user.
 * Collective mediums (WEBHOOK, TOPIC) use group-level settings.
 */
export type AlertMedium = 'EMAIL' | 'SMS' | 'PUSH' | 'WHATSAPP' | 'WEBHOOK' | 'TOPIC' | 'DEFAULT';

/**
 * Dynamic parameter types that can be injected into message templates as {1}, {2}, …
 */
export type AlertParameterType =
    | 'DEVICE_ID'
    | 'DEVICE_NAME'
    | 'GROUP_NAME'
    | 'USER_FIRSTNAME'
    | 'USER_LASTNAME'
    | 'USER_GENDER'
    | 'ALERT_TIME'
    | 'ALERT_DATE_TIME'
    | 'CUSTOM_PARAM'
    | 'SERVICE_NAME'
    | 'SERVICE_HOME'
    | 'ALERT_LINK';

/**
 * A single parameter entry in the template's parameters array.
 * The `param` field is only meaningful for CUSTOM_PARAM (parameter name) and ALERT_LINK (URL template).
 */
export interface AlertParameterItf {
    type: AlertParameterType;
    /** Optional extra value — required for CUSTOM_PARAM and ALERT_LINK */
    param?: string;
}

/**
 * A message body for a specific notification channel.
 */
export interface AlertMediumMessageItf {
    medium: AlertMedium;
    /** Message body; supports Markdown. Use {1}, {2}, … to reference parameters. */
    message: string;
}

/**
 * All channel messages for a given locale.
 */
export interface AlertLocaleMessagesItf {
    /** BCP-47 language tag, e.g. "en", "fr" */
    locale: string;
    mediums: AlertMediumMessageItf[];
}

/**
 * Full alert template as returned by the backend.
 */
export interface AlertTemplateItf {
    /** MongoDB ObjectId, absent on creation request */
    shortId?: string;
    /** Human-readable name (max 100 chars) */
    name: string;
    /** Optional description (max 500 chars) */
    description?: string;
    /** Login hash of the template owner */
    owner?: string;
    /** When true the template is visible to all connected users */
    global: boolean;
    /** Ordered list of parameters; position maps to {1}, {2}, … in messages */
    parameters: AlertParameterItf[];
    /** At least one locale with at least one medium message is required */
    open: AlertLocaleMessagesItf[];
    /** Optional close messages, relevant for FIRE_TO_END and FIRE_UNTIL */
    close: AlertLocaleMessagesItf[];
    behavior: AlertBehavior;
    /** Preferred notification channels, in priority order */
    preferred: AlertMedium[];
    /** Active duration in ms — only used when behavior is FIRE_UNTIL */
    durationMs: number;
}

/**
 * Body for POST /alerts/1.0/template.
 * Include `shortId` to update an existing template; omit to create a new one.
 */
export interface AlertTemplateBodyItf {
    /** Omit to create, include to update */
    shortId?: string;
    name: string;
    description?: string;
    global?: boolean;
    parameters: AlertParameterItf[];
    open: AlertLocaleMessagesItf[];
    close: AlertLocaleMessagesItf[];
    behavior: AlertBehavior;
    preferred: AlertMedium[];
    durationMs: number;
}

/**
 * Response from GET /alerts/1.0/template.
 * The endpoint returns 204 (no body) when no templates match — handled by the API plugin.
 */
export interface AlertTemplateListResponseItf {
    templates: AlertTemplateItf[];
    total: number;
}
