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

  /**
   * Password minimum size
   * Example: 8
   */
  passwordMinSize: number;

  /**
   * Password minimum number of upper case characters
   * Example: 0
   */
  passwordMinUpperCase: number;

  /**
   * Password minimum number of lower case characters
   * Example: 0
   */
  passwordMinLowerCase: number;

  /**
   * Password minimum number of digit characters
   * Example: 0
   */
  passwordMinDigits: number;

  /**
   * Password minimum number of symbols characters
   * Example: 0
   */
  passwordMinSymbols: number;
}


/**
 * User Login Request
 * Equivalent TypeScript interface for the Java class UserLoginBody
 */
export interface UserLoginBody {
  /**
   * Email login
   * Example: "john.doe@foo.bar"
   */
  email: string;

  /**
   * User Password for login
   * Example: "changeme"
   */
  password: string;
}

/**
 * User Login Response
 * Equivalent TypeScript interface for the Java class UserLoginResponse
 */
export interface UserLoginResponse {
  /**
   * User Email
   * Example: "john.doe@foo.bar"
   */
  email?: string;

  /**
   * User login (hash)
   * Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
   */
  login?: string;

  /**
   * JWT Token to be used for authentication
   * You need to add "Bearer " before the token
   */
  jwtToken: string;

  /**
   * JWT with limited access for Token renewal
   * Longer expiration time
   */
  jwtRenewalToken: string;

  /**
   * The password is expired, change required
   * Roles restricted until changed
   */
  passwordExpired: boolean;

  /**
   * User condition has been changed, must accept new condition to gain access
   */
  conditionToValidate: boolean;

  /**
   * First authentication factor is ok, second FA required for full access
   */
  twoFARequired: boolean;

  /**
   * First and Second authentication factor is ok
   */
  twoFAValidated: boolean;

  /**
   * The 2FA expected code size, this helps the front-end to display the right input field
   */
  twoFASize: number;

  /**
   * The 2FA type, this helps the front-end to display the right information
   */
  twoFAType: string;
}

/**
 * User password change payload
 */
export interface UserPasswordChangeBody {
  /**
   * User new password  
   * @example "changeme"  
   * @required
   */
  password: string

  /**
   * User Password change authorization key (for the public endpoint)  
   * @example "jhjfkhqsldjkfhsqljkdhfljsqdhfazuheufhazjkfnds"  
   * @optional
   */
  changeKey?: string
}

/**
 * User password lost request payload
 */
export interface UserPasswordLostBody {

  /**
   * User email to send the password reset link
   * @example "john.doe@foo.bar"
   */
  email: string;

}

/**
 * User registration request payload
 */
export interface UserAccountRegistrationBody {
  /**
   * Email for the account creation
   * @example "john.doe@foo.bar"
   */
  email: string;

  /**
   * Invitation code, for system with invitation required
   * @example "A7C67FB256221..."
   */
  registrationCode?: string;
}
