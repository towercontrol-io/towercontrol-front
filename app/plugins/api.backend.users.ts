import { ofetch } from 'ofetch';
import type { UserConfigResponse } from '~/types';
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

  // Get dynmaic configuration
  const config = useRuntimeConfig();
  const appStore = applicationStore();


  // Client configuration for public API requests
  const apiPublicClient = ofetch.create({
    baseURL: config.public.BACKEND_API_BASE as string,
    headers: {
      'Content-Type': 'application/json'
    }
  });

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

            const response = await apiPublicClient(usersModuleConfigGet, {
                signal: controller.signal,
            })

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

    }

/*
    getUserProfile: (id: string) => apiClient(`/users/${id}`),
    updateUserProfile: (id: string, payload: any) =>
      apiClient(`/users/${id}`, { method: 'PUT', body: payload }),
    listArticles: () => apiClient('/articles')
    */
  }

  return {
    provide: {
      apiBackendUsers
    }
  }
})