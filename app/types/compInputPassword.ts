// General field state shared across inputs
export interface InputPasswordFields<T = string> {
  password : string,        // entred password
  confirmed : boolean,      // true when the password repeated is the same as the first one
  valid : boolean,          // true when the password is valid according to the rules
}