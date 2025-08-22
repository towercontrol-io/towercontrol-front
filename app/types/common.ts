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
};

/**
 * Structure used by the PhoneNumberInput component
 */
export interface PhoneNumberInputState {
  /**
   * Country code (ISO 3166-1 alpha-2)
   * Example: "FR"
   */
  countryCode?: string | undefined;

  /**
   * Is the phone number valid?
   * Example: true
   */
  isValid: boolean;

  /**
   * Is the phone number possible?
   * Example: true
   */
  isPossible: boolean;

  /**
   * Country calling code (e.g. +33 for France)
   * Example: "+33"
   */
  countryCallingCode?: string | undefined;

  /**
   * National number without country calling code
   * Example: "601020304"
   */
  nationalNumber?: string | undefined;

  /**
   * E.164 formatted phone number
   * Example: "+33601020304"
   */
  e164?: string | undefined;

  /**
   * Phone number in a more readable format
   * Example: "+33 6 01 02 03 04"
   */
  phoneNumber?: string | undefined;
};