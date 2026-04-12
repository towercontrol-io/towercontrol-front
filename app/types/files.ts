/**
 * Allowed access levels for a stored file.
 */
export type FileAccessType = 'PUBLIC' | 'CONNECTED' | 'PRIVATE';

/**
 * File metadata response returned by upload, info and list endpoints.
 * The signature field is intentionally omitted for security reasons.
 */
export interface FileUploadResponseItf {
    /**
     * Generated unique filename used for physical storage
     * @example "550e8400-e29b-41d4-a716-446655440000-1712345678901.jpg"
     */
    uniqueName: string;

    /**
     * Original filename provided at upload time
     * @example "photo.jpg"
     */
    originalName: string;

    /**
     * Optional human-readable description
     * @example "Profile picture"
     */
    description?: string;

    /**
     * Detected MIME category: IMAGE, PDF, TEXT, GENERIC
     * @example "IMAGE"
     */
    mimeCategory: string;

    /**
     * Full detected MIME type
     * @example "image/jpeg"
     */
    mimeType: string;

    /**
     * File size in bytes after any resizing
     * @example 204800
     */
    size: number;

    /**
     * Login hash of the user who uploaded the file
     * @example "a3f2b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1"
     */
    ownerId: string;

    /**
     * Access control type: PUBLIC, CONNECTED, PRIVATE
     * @example "PUBLIC"
     */
    accessType: string;

    /**
     * Number of times the file has been successfully downloaded
     * @example 0
     */
    accessCount: number;

    /**
     * Upload timestamp in milliseconds since epoch
     * @example 1712345678901
     */
    createdAt: number;

    /**
     * Last metadata update timestamp in milliseconds since epoch
     * @example 1712345678901
     */
    updatedAt: number;

    /**
     * Unique filename of the generated thumbnail (images only, null otherwise)
     * @example "550e8400-e29b-41d4-a716-446655440000-1712345678901-thumb.jpg"
     */
    thumbnailUniqueName?: string | null;

    /**
     * 6-character short name alias for this file (null when not assigned)
     * @example "aB3xYz"
     */
    shortName?: string | null;

    /**
     * Optional 16-character access key ([a-z0-9]).
     * Only returned to the file owner or an administrator.
     * Append as ?key=<value> to any file URL to grant unauthenticated access to CONNECTED/PRIVATE files.
     */
    accessKey?: string;

}

/**
 * Body sent to PUT /files/1.0/{fileRef} to update file metadata.
 */
export interface FileUpdateBody {
    /** New access level — mandatory */
    accessType: FileAccessType;
    /** New description — optional, send empty string or omit to clear */
    description?: string;
    /**
     * Short name management:
     * - true  = generate a short name if none is assigned yet
     * - false = remove the existing short name
     * - omit  = leave the short name unchanged
     */
    withShortName?: boolean;

    /**
     * Access key management: true = generate (or regenerate) a 16-character access key,
     * false = remove the existing access key, null = leave unchanged
     */
    withAccessKey?: boolean;
}

/**
 * Sort order for the admin file list endpoint.
 */
export type FileAdminSortOrder = 'CREATED' | 'ACCESS';

/**
 * Paginated response returned by the admin file search endpoint.
 * Wraps a page of FileUploadResponseItf entries together with pagination metadata.
 */
export interface FileAdminListResponseItf {
    /** Total number of files matching the search criteria (e.g. 142) */
    total: number;

    /** Current page index, 0-based (e.g. 0) */
    page: number;

    /** Number of records per page, between 1 and 250 (e.g. 50) */
    size: number;

    /** Files on this page */
    files: FileUploadResponseItf[];
}

