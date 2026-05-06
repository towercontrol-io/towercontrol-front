/**
 * Audit Log trace
 */
export interface AuditResponse {
    /**
     * Timestamp of the audit log, ms since EPOCH
     * @example 178667672
     */
    actionMs: number;

    /**
     * Service Name
     * @example USER
     */
    service: string;

    /**
     * Action Name
     * @example USER_CREATE
     */
    action: string;

    /**
     * Owner
     * @example system
     */
    owner: string;

    /**
     * Log String
     * @example A new user xxxx has been created
     */
    logStr: string;

    /**
     * When true chained signature verification is valid (not yet implemented, always true)
     * @example true
     */
    linkChain: boolean;
}

/**
 * Audit log search response
 */
export interface AuditSearchResponse {
    /**
     * Total number of entries matching the search criteria
     * @example 150
     */
    total: number;

    /**
     * Number of elements per page returned
     * @example 50
     */
    pageSize: number;

    /**
     * Total number of pages available for the current search criteria
     * @example 3
     */
    totalPages: number;

    /**
     * Status of the search. 'ok' on success, 'audit-log-non-database' when no database backend is configured.
     * @example ok
     */
    status: string;

    /**
     * List of audit log entries for the requested page, ordered from most recent to oldest
     */
    logs: AuditResponse[];
}