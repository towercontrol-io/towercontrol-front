import type { 
    FileUploadResponseItf,
    FileAccessType
} from '~/types';
import type { ActionResult, ACTION_RESULT } from '~/types';

export default defineNuxtPlugin(() => {

  const GET_TIMEOUT = 5000;     // 5 seconds
  const UPLOAD_TIMEOUT = 30000; // 30 seconds

  // Set the routes
  const filesModuleListFilesGet: string  = '/files/1.0/list';
  const filesModuleUploadPost: string    = '/files/1.0/upload';
  
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

  // Client configuration for multipart uploads (no Content-Type — browser sets the boundary)
  function apiMultipartHeaders() : any  {
    return {
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

  /**
   * Upload a file using multipart/form-data with a longer timeout.
   */
  async function apiCallMultipartWithTimeout<T>(url: string, formData: FormData): Promise<T> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT);

        const response = await $fetch<T>(
                config.public.BACKEND_API_BASE + url,
                {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal,
                    headers: apiMultipartHeaders()
                }
        );
        clearTimeout(timeout);

        if (!response) {
            appStore.setBackendDown();
            throw new Error('Erreur on backend API');
        } else {
            appStore.setBackendUp();
            return response;
        }
    } catch (error: any) {
        if (error.cause?.name === 'AbortError') {
            appStore.setBackendDown();
            error = {
                status: 'UNKNOWN' as ACTION_RESULT,
                status_code: 0,
                message: 'backendTimeout'
            } as ActionResult;
        } else if (error?.response?._data) {
            const actionResult = error.response._data as ActionResult;
            if (actionResult.status == undefined) {
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
            error = {
                status: 'UNKNOWN' as ACTION_RESULT,
                status_code: 0,
                message: 'unknownError'
            } as ActionResult;
        }
        throw error;
    }
  }

  const apiBackendFiles = {
  
    /**
     * Get details of one single public ticket with associated messages
     */
    filesModuleListFiles: async (): Promise<{ success?: FileUploadResponseItf[]; error?: ActionResult | { message: string } }> => {
        try {
            const response = await apiCallwithTimeout<FileUploadResponseItf[]>(
                'GET',
                filesModuleListFilesGet,
                undefined,
                false
            );
            return { success: response }
        } catch (error : any) {
            return { error };
        }
    },

    /**
     * Fetch a thumbnail as a Blob (authenticated). Returns null on error.
     * The caller is responsible for calling URL.revokeObjectURL() when done.
     */
    filesModuleGetThumbnailBlob: async (fileRef: string): Promise<Blob | null> => {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), GET_TIMEOUT);
            const response = await fetch(
                `${config.public.BACKEND_API_BASE}/files/1.0/${fileRef}/thumbnail`,
                {
                    headers: { 'Authorization': `Bearer ${appStore.getBackendJWT()}` },
                    signal: controller.signal
                }
            );
            clearTimeout(timeout);
            if (!response.ok) return null;
            return await response.blob();
        } catch {
            return null;
        }
    },

    /**
     * Upload a new file (multipart/form-data).
     */
    filesModuleUpload: async (
        file: File,
        accessType: FileAccessType,
        description?: string,
        withShortName?: boolean
    ): Promise<{ success?: FileUploadResponseItf; error?: ActionResult | { message: string } }> => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('accessType', accessType);
            if (description) formData.append('description', description);
            if (withShortName) formData.append('withShortName', 'true');

            const response = await apiCallMultipartWithTimeout<FileUploadResponseItf>(
                filesModuleUploadPost,
                formData
            );
            return { success: response };
        } catch (error: any) {
            return { error };
        }
    },


  };
  return {
    provide: {
      apiBackendFiles
    }
  }
})