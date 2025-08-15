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

/**
 * User Self Creation request payload
 */
export interface UserAccountCreationBody {
  /**
   * Email for the account creation. In fact not used for self registration. Here for future usage.
   */
  email?: string;

  /**
   * User Password, used for the account creation
   */
  password: string;

  /**
   * User checked condition Validation, not mandatory on registration but will be requested later
   */
  conditionValidation?: boolean;

  /**
   * Validation ID received by user on registration link
   */
  validationID? : string;
}

/**
 * User ACL (Access Control List) for groups
 * This interface defines the structure of user access control lists, which include group names, local names
 */
export interface UserAcl {
  /**
   * Group name
   * Example: "mygroup"
   */
  group: string;

  /**
   * Allows to change the name of the group locally
   * Example: "my favorite group"
   */
  localName: string;

  /**
   * Roles for the group
   * Example: [ "ROLE_DEVICE_READ" ]
   */
  roles: string[];
}

/**
 * Custom field for user profile
 */
export interface CustomField {
  /**
   * Name of the custom fields
   * Example: "customField1"
   */
  name: string;

  /**
   * Value of the custom field
   * Example: "Custom Value"
   */
  value: string;
}
/**
 * User Basic Profile (loaded on login)
 */
export interface UserBasicProfileResponse {
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
   * First Name
   * Example: "John"
   */
  firstName?: string;

  /**
   * Last Name
   * Example: "Doe"
   */
  lastName?: string;

  /**
   * The password expiration date, in epoch ms
   * Example: 172545052000
   */
  passwordExpirationMs: number;

  /**
   * User language
   * Example: "en"
   */
  language: string;

  /**
   * Last communication seen, used for getting the pending one
   * Example: 172545052000
   */
  lastComMessageSeen: number;

  /**
   * Roles list
   * Example: [ "ROLE_DEVICE_READ", "ROLE_REGISTERED_USER", "ROLE_USER_ADMIN" ]
   */
  roles: string[];

  /**
   * Acls list
   * Example: [ { group: "mygroup", roles: [ "ROLE_DEVICE_READ" ] }, ... ]
   */
  acls: UserAcl[];

  /**
   * Custom fields for the user profile
   */
  customFields: CustomField[];
}

export interface UserProfileCustomFieldBody {

  /**
   * Custom fields for the user profile
   */
  customFields: CustomField[];

}


