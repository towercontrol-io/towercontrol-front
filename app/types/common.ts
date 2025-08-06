/**
 * Possible results of an action
 */
export enum ACTION_RESULT {
  OK = "OK",                  // action complete with success (200)
  CREATED = "CREATED",        // created (201)
  ACCEPTED = "ACCEPTED",      // action accepted - async (202)
  NOCONTENT = "NOCONTENT",    // no Data (204)
  PARTIAL = "PARTIAL",        // partial success (206)
  BADREQUEST = "BADREQUEST",  // bad request (400)
  NOTFOUND = "NOTFOUND",      // not found (404)
  FORBIDDEN = "FORBIDDEN",    // forbidden (403)
  TEAPOT = "TEAPOT",          // I'm a teapot (418)
  TOO_EARLY = "TOO_EARLY",    // too early (425)
  TOO_MANY_REQUESTS = "TOO_MANY_REQUESTS", // too many requests (429)
  UNKNOWN = "UNKNOWN"         // Unknown (300)
}

/**
 * ActionResult interface
 * Equivalent TypeScript interface for the Java class ActionResult
 */
export interface ActionResult {
  /**
   * Result of a given action
   * Example: "OK"
   */
  status: ACTION_RESULT;

  /**
   * Associated custom code, http code
   * Example: 200
   */
  status_code: number;

  /**
   * Associated custom message ready for i18n
   * Example: "err-user-creation-email-already-exist"
   */
  message: string;
}