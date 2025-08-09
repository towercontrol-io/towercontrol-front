import type { UserConfigResponse, UserLoginBody, UserLoginResponse, UserPasswordChangeBody, UserPasswordLostBody, UserAccountRegistrationBody } from '~/types';
import type { ActionResult } from '~/types';
import { applicationStore } from '~/stores/app'

const GET_TIMEOUT = 5000; // 5 seconds
const CACHE_TTL = 10 * 60 * 1000; // 5 minutes in milliseconds
let cache: { data: UserConfigResponse | null; timestamp: number } = {
  data: null,
  timestamp: 0
}

export default defineNuxtPlugin(() => {

  // Set the routes
  const usersModuleConfigGet : string = '/users/1.0/config';
  const usersModuleLoginPost: string = '/users/1.0/session/signin';
  const usersModuleUpgradeGet: string = '/users/1.0/session/upgrade';
  const usersModuleEulaPut: string = '/users/1.0/profile/eula';
  const usersModulePasswordChangePut: string = '/users/1.0/profile/password/change';
  const usersModulePasswordLostReqPost: string = '/users/1.0/profile/password/request';
  const usersModuleRegisterReqPost: string = '/users/1.0/registration/register';

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

  const apiBackendUsers = {

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

        // Vérifie si le cache est valide
        if (cache.data && now - cache.timestamp < CACHE_TTL) {
            return cache.data
        }

        try {
            // Gestion du timeout (5s)
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), GET_TIMEOUT)

            const response = await $fetch<UserConfigResponse>(
                config.public.BACKEND_API_BASE+usersModuleConfigGet, 
                {
                    method: 'GET',
                    signal: controller.signal,
                    headers: apiPublicHeaders
                }
            );
            clearTimeout(timeout)

            // Check the restponse code 200 expected
            if (!response) {
                appStore.setBackendDown();
                throw new Error(`Erreur on backend API`)
            } else {
                appStore.setBackendUp();
            }

            // Update cache
            cache = {
                data: response,
                timestamp: now,
            }

            return response;
        } catch (error: any) {
            // Timeout ou autre erreur → on met globalVariable à false
            appStore.setBackendDown();
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
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), GET_TIMEOUT) // 20s timeout
        let body: UserLoginBody = {
            email: login,
            password: password
        };
        try {
            const response = await $fetch<UserLoginResponse>(
                config.public.BACKEND_API_BASE+usersModuleLoginPost, 
                {
                    method: 'POST',
                    body: body,
                    signal: controller.signal,
                    headers: apiPublicHeaders
                }
            );
            clearTimeout(timeoutId)
            appStore.setBackendUp();
            appStore.setBackendJWT(response.jwtToken);
            appStore.setRefreshJWT(response.jwtRenewalToken);
            appStore.setRenewJWTbefore(getJWTEndDate(response.jwtToken) || 0);
            appStore.setUserEmail(response.email || null);
            appStore.setUserLogin(response.login || null);
            appStore.setUser2faSize(response.twoFASize || 0);
            appStore.setUser2faType(response.twoFAType || '');
            return { success: response }
        } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                appStore.setBackendDown();
                return { error: { message: 'common.backendTimeout' } }
            }
            // Try to parse error as ActionResult
            if (err?.response?._data) {
                return { error: err.response._data as ActionResult }
            }
            return { error: { message: 'common.unknownError' } }
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GET_TIMEOUT); // 20s timeout
        const url : string = config.public.BACKEND_API_BASE+usersModuleUpgradeGet+((twoFaCode!=='')?`?secondFactor=${twoFaCode}`:'');
        try {
            const response = await $fetch<UserLoginResponse>(
                url,
                {
                    method: 'GET',
                    signal: controller.signal,
                    headers: apiSessionHeaders()
                }
            );
            clearTimeout(timeoutId)
            appStore.setBackendUp();
            appStore.setBackendJWT(response.jwtToken);
            appStore.setRefreshJWT(response.jwtRenewalToken);
            appStore.setRenewJWTbefore(getJWTEndDate(response.jwtToken) || 0);
            appStore.setUserEmail(response.email || null);
            appStore.setUserLogin(response.login || null);
            appStore.setUser2faSize(response.twoFASize || 0);
            appStore.setUser2faType(response.twoFAType || '');
            return { success: response }
        } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                appStore.setBackendDown();
                return { error: { message: 'common.backendTimeout' } }
            }
            // Try to parse error as ActionResult
            if (err?.response?._data) {
                return { error: err.response._data as ActionResult }
            }
            return { error: { message: 'common.unknownError' } }
        }
    },
    /**
     * Request the EULA validation, this is called when the user has to accept the EULA
     * 
     * @param none
     */
    putUserProfileEula: async (): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GET_TIMEOUT); // 20s timeout
        const url : string = config.public.BACKEND_API_BASE+usersModuleEulaPut;
        try {
            const response = await $fetch<ActionResult>(
                url,
                {
                    method: 'PUT',
                    signal: controller.signal,
                    headers: apiSessionHeaders()
                }
            );
            clearTimeout(timeoutId)
            return { success: response }
        } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                appStore.setBackendDown();
                return { error: { message: 'common.backendTimeout' } }
            }
            // Try to parse error as ActionResult
            if (err?.response?._data) {
                return { error: err.response._data as ActionResult }
            }
            return { error: { message: 'common.unknownError' } }
        }
    },
    /**
     * Change the user password, this is called when the user has to change the password
     * after login or when the password is expired.
     * 
     * @param {string} newPassword - The new user password
     */
    putUserProfilePasswordChange: async (newPassword: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GET_TIMEOUT); // 20s timeout
        const url : string = config.public.BACKEND_API_BASE+usersModulePasswordChangePut;
        const body: UserPasswordChangeBody = {
            password: newPassword,
            changeKey: ''
        };
        try {
            const response = await $fetch<ActionResult>(
                url,
                {
                    method: 'PUT',
                    body: body,
                    signal: controller.signal,
                    headers: apiSessionHeaders()
                }
            );
            clearTimeout(timeoutId)
            return { success: response }
        } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                appStore.setBackendDown();
                return { error: { message: 'common.backendTimeout' } }
            }
            // Try to parse error as ActionResult
            if (err?.response?._data) {
                return { error: err.response._data as ActionResult }
            }
            return { error: { message: 'common.unknownError' } }
        }
    },
    /**
     * Request Link for password change in case of lost password
     * 
     * @param {string} email - The user email
     */
    postUserProfilePasswordLostReq: async (email: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GET_TIMEOUT); // 20s timeout
        const url : string = config.public.BACKEND_API_BASE+usersModulePasswordLostReqPost;
        const body: UserPasswordLostBody = {
            email: email
        };
        try {
            const response = await $fetch<ActionResult>(
                url,
                {
                    method: 'POST',
                    body: body,
                    signal: controller.signal,
                    headers: apiPublicHeaders
                }
            );
            clearTimeout(timeoutId)
            return { success: response }
        } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                appStore.setBackendDown();
                return { error: { message: 'common.backendTimeout' } }
            }
            // Try to parse error as ActionResult
            if (err?.response?._data) {
                return { error: err.response._data as ActionResult }
            }
            return { error: { message: 'common.unknownError' } }
        }
    },
    /**
     * Request Registration, this is called when the user wants to register a new account
     * 
     * @param {string} email - The user email
     * @param {string} code - The invitation code
     */
    postUserRegistrationRequest: async (email: string, code: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), GET_TIMEOUT); // 20s timeout
        const url : string = config.public.BACKEND_API_BASE+usersModuleRegisterReqPost;
        const body: UserAccountRegistrationBody = {
            email: email,
            registrationCode: code,
        };
        try {
            const response = await $fetch<ActionResult>(
                url,
                {
                    method: 'POST',
                    body: body,
                    signal: controller.signal,
                    headers: apiPublicHeaders
                }
            );
            clearTimeout(timeoutId)
            return { success: response }
        } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                appStore.setBackendDown();
                return { error: { message: 'common.backendTimeout' } }
            }
            // Try to parse error as ActionResult
            if (err?.response?._data) {
                return { error: err.response._data as ActionResult }
            }
            return { error: { message: 'common.unknownError' } }
        }
    },
  };
  return {
    provide: {
      apiBackendUsers
    }
  }
})