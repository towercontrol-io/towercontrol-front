import type { UserConfigResponse, UserLoginBody, UserLoginResponse, UserPasswordChangeBody, UserPasswordLostBody, UserAccountRegistrationBody } from '~/types';
import type { UserAccountCreationBody, UserAcl, UserBasicProfileResponse, ACTION_RESULT } from '~/types';
import type { ActionResult } from '~/types';
import { applicationStore } from '~/stores/app'

const GET_TIMEOUT = 5000; // 5 seconds
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes in milliseconds
let cache: { data: UserConfigResponse | null; timestamp: number } = {
  data: null,
  timestamp: 0
}

const PROFILE_CACHE_TTL = 60 * 60 * 1000; // 60 minutes in milliseconds
let profileCache: { 
    profile: UserBasicProfileResponse | null;
    timestamp: number; 
    forceRefresh: boolean;
} = {
    profile: null,
    timestamp: 0,
    forceRefresh: false
};


export default defineNuxtPlugin(() => {

  // Set the routes
  const usersModuleConfigGet : string = '/users/1.0/config';
  const usersModuleLoginPost: string = '/users/1.0/session/signin';
  const usersModuleUpgradeGet: string = '/users/1.0/session/upgrade';
  const usersModuleEulaPut: string = '/users/1.0/profile/eula';
  const usersModulePasswordChangePut: string = '/users/1.0/profile/password/change';
  const usersModulePasswordLostReqPost: string = '/users/1.0/profile/password/request';
  const usersModuleRegisterReqPost: string = '/users/1.0/registration/register';
  const usersModuleCreationReqPost: string = '/users/1.0/creation/create';
  const usersModuleChangePassReqPost: string = '/users/1.0/profile/password/reset';
  const usersModuleProdileBasicGet: string = '/users/1.0/profile/basic';

  // Get dynmaic configuration
  const config = useRuntimeConfig();
  const appStore = applicationStore();


  // Client configuration for public API requests
  const apiPublicHeaders =  {
      'Content-Type': 'application/json'
  };

  // Client configuration for session API requests
  function apiSessionHeaders() : any  {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${appStore.getBackendJWT()}`
    }
  };

  function getJWTEndDate(token: string): number | null {
    try {
        // Décoder le payload du JWT
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Vérifier si le champ exp existe
        if (!payload.exp) return null;

        // Convertir exp (secondes) en millisecondes
        const expirationMs = payload.exp * 1000;

        // Soustraire 15 minutes (900000 ms)
        return expirationMs - 15 * 60 * 1000;
    } catch (error) {
        console.error("Invalid JWT:", error);
        return null;
    }
  }
  /**
   * Generic Functon to call backend API with timeout and backend status management.
   * 
   * @param _method 
   * @param url 
   * @param body 
   * @param public 
   * @returns 
   */
  async function apiCallwithTimeout<T>(_method: any, url: string, body: any, isPublic: boolean): Promise<T> {
    try {
        // Gestion du timeout (5s)
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), GET_TIMEOUT)

        const response = await $fetch<T>(
                config.public.BACKEND_API_BASE+url, 
                {
                    method: _method,
                    body: body,
                    signal: controller.signal,
                    headers: (isPublic) ? apiPublicHeaders : apiSessionHeaders()
                }
        );
        clearTimeout(timeout)

        // Check the restponse code 200 expected
        if (!response) {
            appStore.setBackendDown();
            throw new Error(`Erreur on backend API`)
        } else {
            appStore.setBackendUp();
            return response;
        }
    } catch (error: any) {
        // Test Timeout situation
        //console.log('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
        if (error.cause?.name === 'AbortError') {
            appStore.setBackendDown();
            error = {
                status: 'UNKNOWN' as ACTION_RESULT,
                status_code: 0,
                message: 'backendTimeout' 
            } as ActionResult;
        }
        // Try to match an ActionResult error (if not the case report server error)
        else if (error?.response?._data) {
            const actionResult = error.response._data as ActionResult;
            if ( actionResult.status == undefined ) {
                appStore.setBackendDown();
                error = {
                    status: 'UNKNOWN' as ACTION_RESULT,
                    status_code: 0,
                    message: 'unknownError' 
                } as ActionResult;
            } else {
               error = actionResult;
            }
        } else {
            // probably cors error
            error = {
                status: 'UNKNOWN' as ACTION_RESULT,
                status_code: 0,
                message: 'unknownError' 
            } as ActionResult;
        }
        throw error
    }
  }

  const apiBackendUsers = {

    /**
     * Get the user profile, cache it until the refresh is forced or on every 60 minutes.
     */
    getUserProfile: async (): Promise<UserBasicProfileResponse> => {
        const now = Date.now()

        // check cache validity
        if (profileCache.profile && now - profileCache.timestamp < CACHE_TTL && !profileCache.forceRefresh) {
            return profileCache.profile
        }

        // Call API
        try {
            const response = await apiCallwithTimeout<UserBasicProfileResponse>(
                'GET',
                usersModuleProdileBasicGet,
                null,
                false
            );
            profileCache.profile = response;
            profileCache.timestamp = now;
            return response;
        } catch (error : any) {
            // in case of error, keep returning cached version
            if ( profileCache.profile ) return profileCache.profile;
            return error;
        }
    },

    /**
     * Get the user module configuration. Thi will be used to determine que UI behavior
     * and hide the feature not activated on backend. This is cached for 10 minutes to
     * avoid too many request with the same data but allowing a dynamic update of the
     * configuration.
     * This updates the global variable `backendUp` to true or false depending on the 
     * response status to globally display an error when the vbackend is down or too slow.
     * @returns the user module configuration structure
     */
    getUserModuleConfig: async (): Promise<UserConfigResponse> => {
        const now = Date.now()

        // Check cache validity
        if (cache.data && now - cache.timestamp < CACHE_TTL) {
            return cache.data
        }

        // Call API
        try {
            const response = await apiCallwithTimeout<UserConfigResponse>(
                'GET',
                usersModuleConfigGet,
                null,
                true
            );
            cache.data = response;
            cache.timestamp = now;
            return response;
        } catch (error : any) {
            throw error
        }
    },


    /**
     * Login function, the login and password are sent to the backend
     * the response when a success is stored in the local starage to 
     * maintain the jwt and also the user profile with the user id.
     * 
     * @param {string} login - The user login
     * @param {string} password - The user password
     */
    postUserLogin: async (login: string, password: string): Promise<{ success?: UserLoginResponse; error?: ActionResult | { message: string } }> => {
        let body: UserLoginBody = {
            email: login,
            password: password
        };

        try {
            const response = await apiCallwithTimeout<UserLoginResponse>(
                'POST',
                usersModuleLoginPost,
                body,
                true
            );
            appStore.setBackendUp();
            appStore.setBackendJWT(response.jwtToken);
            appStore.setRefreshJWT(response.jwtRenewalToken);
            appStore.setRenewJWTbefore(getJWTEndDate(response.jwtToken) || 0);
            appStore.setUserEmail(response.email || null);
            appStore.setUserLogin(response.login || null);
            appStore.setUser2faSize(response.twoFASize || 0);
            appStore.setUser2faType(response.twoFAType || '');
            return { success: response }
        } catch (error : any) {
            return { error };
        }

    },

    /**
     * Upgrade Login function, after login / password verification, the user complete the login
     * with a 2FA code or with a password change or eula validation. Upgrade login is called until
     * the user is fully authenticated.
     * 
     * @param {string} twoFaCode - The user 2FA code
     */
    getUserSessionUpgrade: async (twoFaCode: string): Promise<{ success?: UserLoginResponse; error?: ActionResult | { message: string } }> => {
        const url : string = usersModuleUpgradeGet+((twoFaCode!=='')?`?secondFactor=${twoFaCode}`:'');
        try {
            const response = await apiCallwithTimeout<UserLoginResponse>(
                'GET',
                url,
                null,
                false
            );
            appStore.setBackendUp();
            appStore.setBackendJWT(response.jwtToken);
            appStore.setRefreshJWT(response.jwtRenewalToken);
            appStore.setRenewJWTbefore(getJWTEndDate(response.jwtToken) || 0);
            appStore.setUserEmail(response.email || null);
            appStore.setUserLogin(response.login || null);
            appStore.setUser2faSize(response.twoFASize || 0);
            appStore.setUser2faType(response.twoFAType || '');
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },
    /**
     * Request the EULA validation, this is called when the user has to accept the EULA
     * 
     * @param none
     */
    putUserProfileEula: async (): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<ActionResult>(
                'PUT',
                usersModuleEulaPut,
                null,
                false
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },
    /**
     * Change the user password, this is called when the user has to change the password
     * after login or when the password is expired.
     * 
     * @param {string} newPassword - The new user password
     */
    putUserProfilePasswordChange: async (newPassword: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const body: UserPasswordChangeBody = {
            password: newPassword,
            changeKey: ''
        };
        try {
            const response = await apiCallwithTimeout<ActionResult>(
                'PUT',
                usersModulePasswordChangePut,
                body,
                false
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },
    /**
     * Request Link for password change in case of lost password
     * 
     * @param {string} email - The user email
     */
    postUserProfilePasswordLostReq: async (email: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const body: UserPasswordLostBody = {
            email: email
        };
        try {
            const response = await apiCallwithTimeout<ActionResult>(
                'POST',
                usersModulePasswordLostReqPost,
                body,
                true
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },
    /**
     * Request Registration, this is called when the user wants to register a new account
     * 
     * @param {string} email - The user email
     * @param {string} code - The invitation code
     */
    postUserRegistrationRequest: async (email: string, code: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const body: UserAccountRegistrationBody = {
            email: email,
            registrationCode: code,
        };
        try {
            const response = await apiCallwithTimeout<ActionResult>(
                'POST',
                usersModuleRegisterReqPost,
                body,
                true
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },
    /**
     * Account creation, this is called after receiving the email validation code.
     * 
     * @param {string} password - The user password
     * @param {boolean} condition - true when the service usage conditions has been accepted
     * @param {string} code - The invitation code
     */
    postUserCreationRequest: async (password: string, condition: boolean, code: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const body: UserAccountCreationBody = {
            password: password,
            conditionValidation: condition,
            validationID: code
        };
        try {
            const response = await apiCallwithTimeout<ActionResult>(
                'POST',
                usersModuleCreationReqPost,
                body,
                true
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },
    /**
     * Account creation, this is called after receiving the email validation code.
     * 
     * @param {string} password - The user password
     * @param {boolean} condition - true when the service usage conditions has been accepted
     * @param {string} code - The invitation code
     */
    putUserPasswordResetRequest: async (password: string, code: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const body: UserPasswordChangeBody = {
            password: password,
            changeKey: code
        };
        try {
            const response = await apiCallwithTimeout<ActionResult>(
                'PUT',
                usersModuleChangePassReqPost,
                body,
                true
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },

  };
  return {
    provide: {
      apiBackendUsers
    }
  }
})