import type { CaptureProtocolResponseItf, MandatoryField, CaptureEndpointResponseItf } from '~/types';
import type { ActionResult, ACTION_RESULT } from '~/types';
import { applicationStore } from '~/stores/app'

export default defineNuxtPlugin(() => {

  const GET_TIMEOUT = 5000; // 5 seconds

  // Set the routes
  const captureModuleProtocolListGet: string = '/capture/1.0/protocol';
  const captureModuleEndpointListGet: string = '/capture/1.0/endpoint';
  const captureModuleEndpointDelete: string = '/capture/1.0/endpoint/{id}/';

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

  const apiBackendCapture = {
  
    /**
     * Get the list of available protocols 
     */
    captureModuleGetProtocols : async (): Promise<{ success?: CaptureProtocolResponseItf[]; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<CaptureProtocolResponseItf[]>(
                'GET',
                captureModuleProtocolListGet,
                undefined,
                false
            );
            return { success: response };
        } catch (error : any) {
            return { error };
        }
    },

    /**
     * Get the list of available endpoints 
     */
    captureModuleGetEndpoints : async (): Promise<{ success?: CaptureEndpointResponseItf[]; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<CaptureEndpointResponseItf[]>(
                'GET',
                captureModuleEndpointListGet,
                undefined,
                false
            );
            return { success: response };
        } catch (error : any) {
            return { error };
        }
    },


    /**
     * Delete the capture endpoint
     */
    captureModuleDeleteEndpoint: async (endpointId: string): Promise<{ success?: ActionResult; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<ActionResult>(
                'DELETE',
                captureModuleEndpointDelete.replace('{id}', endpointId),
                undefined,
                false
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },

  };
  return {
    provide: {
      apiBackendCapture
    }
  }
})