import type { UserConfigResponse, UserLoginBody, UserLoginResponse } from '~/types';
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

  // Get dynmaic configuration
  const config = useRuntimeConfig();
  const appStore = applicationStore();


  // Client configuration for public API requests
  const apiPublicHeaders =  {
      'Content-Type': 'application/json'
 };

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
                appStore.backendUp = false;
                throw new Error(`Erreur on backend API`)
            } else {
                appStore.backendUp = true;
            }

            // Update cache
            cache = {
                data: response,
                timestamp: now,
            }

            return response;
        } catch (error: any) {
            // Timeout ou autre erreur → on met globalVariable à false
            appStore.backendUp = false
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
            appStore.backendUp = true;
            return { success: response }
        } catch (err: any) {
            clearTimeout(timeoutId)
            if (err.name === 'AbortError') {
                appStore.backendUp = false;
                return { error: { message: 'common.backendTimeout' } }
            }
            // Try to parse error as ActionResult
            if (err?.response?._data) {
                return { error: err.response._data as ActionResult }
            }
            return { error: { message: 'common.unknownError' } }
        }
    },
 }
  return {
    provide: {
      apiBackendUsers
    }
  }
})