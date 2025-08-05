export interface UserConfigResponse {
 /**
   * Self registration is allowed
   * Example: true
   */
  selfRegistration?: boolean

  /**
   * Invitation code required
   * Example: true
   */
  invitationCodeRequired?: boolean

  /**
   * Registration link will be sent by email
   * Example: true
   */
  registrationLinkByEmail: boolean

  /**
   * User auto-validation is allowed / admin must not manually validate the user
   * Example: true
   */
  autoValidation: boolean

  /**
   * EULA validation is required
   * Example: true
   */
  eulaRequired: boolean
}