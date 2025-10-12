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

  /**
   * Account deletion, purgatory delay in hours (0 means immediate deletion)
   * Example: 24
   */
  deletionPurgatoryDelayHours : number;

  /**
   * User can create a sub group under the virtual group
   * Example: true
   * Required
   */
  subGroupUnderVirtualAllowed: boolean;
};


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
};

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
};

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
};

/**
 * User password lost request payload
 */
export interface UserPasswordLostBody {

  /**
   * User email to send the password reset link
   * @example "john.doe@foo.bar"
   */
  email: string;

};

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
};

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
};

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
};

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
};


/**
 * Possible results of an action
 */
export enum TwoFATypes {
  NONE = "NONE",                  // None (no 2FA)
  EMAIL = "EMAIL",                // EMAIL
  SMS = "SMS",                    // SMS
  AUTHENTICATOR = "AUTHENTICATOR" // AUTHENTICATOR
};

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
   * Phone Number (mobile for SMS 2FA)
   * Example: "+33601020304"
   */
  mobileNumber?: string;

  /**
   * Iso country code (used for the phone number)
   * Example : "FR"
   */
  isoCountryCode?: string;

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

  /**
   * 2FA Type
   * Example: "AUTHENTICATOR"
   */
  twoFAConfig: TwoFATypes;
}

export interface UserProfileCustomFieldBody {

  /**
   * User login (hash)
   * Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
   */
  login: string;

  /**
   * Custom fields for the user profile
   */
  customFields: CustomField[];

};

export interface UserBasicProfileBody {
  /** 
   * User to be modified login (hash) 
   * Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
   * Required: No
   */
  login?: string;

  /** 
   * First Name 
   * Example: "John"
   * Required: No
   */
  firstName?: string;

  /** 
   * Last Name 
   * Example: "Doe"
   * Required: No
   */
  lastName?: string;

  /**
   * Phone Number (mobile for SMS 2FA)
   * Example: "+33601020304"
   */
  mobileNumber?: string;

    /**
   * Iso country code (used for the phone number)
   * Example : "FR"
   */
  isoCountryCode?: string;

  /** 
   * User language 
   * Example: "en"
   * Required: Yes
   */
  language: string;

  /** 
   * List of profile custom fields decrypted 
   * Example: [ { name : "basic_xxx", value : "xxxx" }, ... ]
   * Required: No
   */
  customFields?: CustomField[];
};

/**
 * User Two Factor Authentication Body
 * Equivalent TypeScript interface for the Java class UserTwoFaBody
 */
export interface UserTwoFaBody {

  /**
   * Set the 2FA method to be used ('NONE', 'EMAIL', 'SMS', 'AUTHENTICATOR')
   * Example: "AUTHENTICATOR"
   */
  twoFaType: TwoFATypes;

}

/**
 * User Two Factor Authentication Response
 * Equivalent TypeScript interface for the Java class UserTwoFaResponse
 */
export interface UserTwoFaResponse {

  /**
   * Set the 2FA method to be used ('NONE', 'EMAIL', 'SMS', 'AUTHENTICATOR')
   * Example: "AUTHENTICATOR"
   */
  twoFaType: TwoFATypes;

  /**
   * Two Factor secret, used to generate the 2FA code (authenticator app only)
   * Example: "otpauth://totp/{servicename}:{username}?secret={secret}&issuer={servicename}"
   */
  secret?: string;
};

/**
 * User List Element Response
 * Equivalent TypeScript interface for the Java class UserListElementResponse
 */
export interface UserListElementResponse {
  /**
   * User login (hash)
   * Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
   */
  login: string;

  /**
   * User email
   * Example: "john.doe@foo.bar"
   */
  email: string;

  /**
   * Last login date (timestamp in ms)
   * Example: 1697056894000
   */
  lastLogin: number;

  /**
   * Number of login for that user
   * Example: 10
   */
  countLogin: number;

  /**
   * Registration date (timestamp in ms)
   * Example: 1697056894000
   */
  registrationDate: number;

  /**
   * Deletion date (timestamp in ms)
   * Example: 1697056894000
   */
  deletionDate: number;

  /**
   * User is active
   * Example: true
   */
  isActive: boolean;

  /**
   * User is locked
   * Example: true
   */
  isLocked: boolean;

  /**
   * User password is expired
   * Example: true
   */
  isPasswordExpired: boolean;

  /**
   * User is an API account
   * Example: true
   */
  isApiAccount: boolean;

  /**
   * User 2 Factor Authentication mode (NONE, EMAIL, SMS, AUTHENTICATOR)
   * Example: "AUTHENTICATOR"
   */
  twoFa: TwoFATypes;
};

/**
 * User Identification Body
 * Equivalent TypeScript interface for the Java class UserIdentificationBody
 */
export interface UserIdentificationBody {
  /**
   * The user login (hash) to be identified
   * Example: "E5C35687AF..."
   */
  login: string;
};

/**
 * User Search Body
 * Equivalent TypeScript interface for the Java class UserSearchBody
 */
export interface UserSearchBody {
  /**
   * The user email (hash) to be searched or the user login (hash)
   * Example: "john.doe@foo.bar" or "E5C35687AF..."
   */
  search: string;
};

/**
 * User State Switch Body
 * Equivalent TypeScript interface for the Java class UserStateSwitchBody
 */
export interface UserStateSwitchBody {
  /**
   * The user login (hash) to be restored for purgatory
   * Example: "E5C35687AF..."
   */
  login: string;

  /**
   * The expected state true / false
   * Example: true
   */
  state: boolean;
}

export interface UserAccessibleRolesResponse {
  /**
   * Name of the role
   * Example: "ROLE_USER_ADMIN"
   */
  name: string;

  /**
   * Description slug for i18n
   * Example: "role-user-admin"
   */
  description: string;

  /**
   * Description english string
   * Example: "user administrator"
   */
  enDescription: string;
}


export interface UserUpdateBody {
  /**
   * User to be modified login (hash)
   * Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
   */
  login: string;

  /**
   * To indicate if the roles structure is to be considered
   * Example: true
   */
  considerRoles: boolean;

  /**
   * List of affectable roles
   * Example: [ "ROLE_GROUP_LADMIN", "ROLE_DEVICE_READ" ]
   */
  roles?: string[];

  /**
   * To indicate if the group list is to be considered
   * Example: true
   */
  considerGroups: boolean;

  /**
   * List of owned groups (shortId)
   * Example: [ "XdfhYII", "Jy6FSHB" ]
   */
  groups?: string[];

  /**
   * To indicate if the ACL list is to be considered
   * Example: true
   */
  considerACLs: boolean;

  /**
   * List of acls
   */
  acls?: UserAcl[];
}

export interface UserUpdateBodyRequest {
  /**
   * User to be modified login (hash)
   * Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
   * Required
   */
  login: string;

  /**
   * To indicate if the roles structure is to be considered
   * Example: true
   * Required
   */
  considerRoles: boolean;

  /**
   * To indicate if the group list is to be considered
   * Example: true
   * Required
   */
  considerGroups: boolean;

  /**
   * To indicate if group list contains subgroups
   * Example: true
   * Required
   */
  considerSubs: boolean;

  /**
   * To indicate if the ACL list is to be considered
   * Example: true
   * Required
   */
  considerACLs: boolean;
}

export interface RoleItf {
  /**
   * Role name, required for modifications
   * Example: "ROLE_USER_ADMIN"
   */
  name: string;

  /**
   * Role description used for i18n
   * Example: "role-user-admin-desc"
   */
  description?: string;

  /**
   * Role description in english
   * Example: "User administrator"
   */
  enDescription?: string;

  /**
   * False for technical roles not assignable by user.
   * Example: true
   */
  assignable?: boolean;
}

export interface GroupAttribute {
  /**
   * Type of attribute for search, it must start by the module name
   * Example: "billing"
   */
  type: string;

  /**
   * Associated parameters, content depends on type
   */
  params: GroupAttributeParam[];
}

export interface GroupAttributeParam {
  /**
   * Name of the parameter
   * Example: "account"
   */
  key: string;

  /**
   * Associated values
   * Example: [ "1234", "abcd" ]
   */
  values: string[];
}

export interface GroupItf {
  /**
   * Group shortId, required for modifications
   * Example: "XyJl1djk"
   */
  shortId: string;

  /**
   * Group name
   * Example: "My Favorite Group"
   */
  name: string;

  /**
   * Group description
   * Example: "User administrator"
   */
  description: string;

  /**
   * Group attributes
   * Example: [{ name: "type", value: "admin" }]
   */
  attributes?: GroupAttribute[];

  /**
   * List of sub-groups
   * Example: [{ shortId: "XyJl1djk", name: "My Favorite SubGroup" }]
   */
  subs?: GroupItf[];
}

/**
 * Acls information
 * Acls structure for front-end usage
 */
export interface AclItf {
  /**
   * Master ACL the user has access to
   * Example: Acl structure
   * Required
   */
  acl: UserAcl;

  /**
   * Sub-acls
   * Example: List ACLS herited from sub-groups
   * Optional
   */
  subs?: AclItf[];
}

/**
 * User Update Body Response
 * Equivalent TypeScript interface for the Java class UserUpdateBodyResponse
 */
export interface UserUpdateBodyResponse {
  /**
   * User to be modified login (hash)
   * Example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
   * Required
   */
  login: string;

  /**
   * To indicate if the roles structure is to be considered
   * Example: true
   * Required
   */
  considerRoles: boolean;

  /**
   * List of affectable roles
   * Example: [ { name: "ROLE_USER_ADMIN", description: "role-user-admin-desc", enDescription: "User administrator" } ]
   * Optional
   */
  roles?: RoleItf[];

  /**
   * To indicate if the group list is to be considered
   * Example: true
   * Required
   */
  considerGroups: boolean;

  /**
   * To indicate if group list contains subgroups
   * Example: true
   * Required
   */
  considerSubs: boolean;

  /**
   * List of owned groups (shortId)
   * Example: [ { shortId: "XdfhYII", name: "My Favorite Group" } ]
   * Optional
   */
  groups?: GroupItf[];
  
  /**
   * To indicate if the ACL list is to be considered
   * Example: true
   * Required
   */
  considerACLs: boolean;

  /**
   * List of acls
   * Optional
   */
  acls?: AclItf[];
}