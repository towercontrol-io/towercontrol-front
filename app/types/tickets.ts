import type { CustomField } from './common';

/**
 * Body used to create a new ticket (private API)
 */
export interface PrivTicketCreationBody {
    /** Ticket short title (Markdown allowed) */
    topic: string;

    /** Ticket content in Markdown */
    content: string;

    /** Contextual custom fields used to add metadata to the ticket */
    context?: CustomField[];

    /** Anonymous user email (if not logged in) empty if logged in */
    email?: string;

    /** Optional technical context information. Not set by used but collected by frontend or smartphone application. */
    techContext?: string;

    /** Confirmation code to validate ticket creation for public users */
    confirmationCode?: string;
}

export interface PrivTicketCreationResponseItf {

    /** Ticket ID user can use in communication later, set when the ticket has been created */
    ticketId?: number;

    /** Confirmation code to validate ticket creation for public users, set for public creation only */
    confirmationCode?: string;

}


/**
 * Ticket abstract body (used for the list of tickets)
 */
export interface PrivTicketAbstractResponseItf {
    /** Ticket id */
    id: number;

    /** Ticket short title (Markdown allowed) */
    topic: string;

    /** Moment of creation in milliseconds since epoch */
    creationMs: number;

    /** Status of the ticket (OPEN | CLOSED) */
    status: string;
}


/**
 * PrivMessageContent - One of the message reply
 */
export interface PrivMessageContent {
    /** Reply id */
    id: string;

    /** Response date in milliseconds since epoch */
    creationMs: number;

    /** Ticket message content (Markdown allowed) */
    content: string;
}

/**
 * Ticket content & replies
 */
export interface PrivTicketUserDetailResponseItf {
    /** Ticket id */
    id: number;

    /** Ticket content (Markdown allowed) */
    content: string;

    /** List of responses & replies to the ticket */
    responses: PrivMessageContent[];
}
