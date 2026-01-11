<script setup lang="ts">
    import { ref, computed, reactive } from 'vue';
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';
    import type { CaptureProtocolResponseItf, MandatoryField, CaptureEndpointResponseItf } from '~/types';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'endpointAdmin' }});

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const router = useRouter();
    const appStore = applicationStore();
    const config = useRuntimeConfig();

    const componentCtx = reactive({
        creationMode: false as boolean,

        apiLoadError: null as string | null,
        protocolList: [] as CaptureProtocolResponseItf[],
        endpointList: [] as CaptureEndpointResponseItf[],
    });

    // =======================================================
    // PROTOCOL LIST
    // =======================================================
    const loadProtocolList = () => {
        componentCtx.apiLoadError = null;
        componentCtx.protocolList = [];

        nuxtApp.$apiBackendCapture.captureModuleGetProtocols().then((res) => {
            if ( res.success ) {
                componentCtx.protocolList = res.success as CaptureProtocolResponseItf[];
  console.log(componentCtx.protocolList);               
            } else if ( res.error ) {
                componentCtx.apiLoadError = t('capture.errorLoadingProtocols');
            }
        })
        .catch( ( err ) => {
            componentCtx.apiLoadError = t('capture.errorLoadingProtocols');
        });
    };


    // =======================================================
    // ENDPOINT LIST
    // =======================================================
   const loadEndpointList = () => {
        componentCtx.apiLoadError = null;
        componentCtx.protocolList = [];

        nuxtApp.$apiBackendCapture.captureModuleGetEndpoints().then((res) => {
            if ( res.success ) {
                componentCtx.endpointList = res.success as CaptureEndpointResponseItf[];
   console.log(componentCtx.endpointList);              
            } else if ( res.error ) {
                componentCtx.apiLoadError = t('capture.errorLoadingEndpoints');
            }
        })
        .catch( ( err ) => {
            componentCtx.apiLoadError = t(err.message || 'capture.errorLoadingEndpoints');
        });
    };

    onMounted(() => {
        loadProtocolList();
        loadEndpointList();
    });

</script> 

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-4xl mx-auto mb-4">
        <UPageCard
        :title="$t('capture.title')"
        :description="$t('capture.description')"
        variant="naked"
        orientation="horizontal"
        class="mb-4"
        >
        <UButton
            form="settings"
            :label="$t('capture.create')"
            :disabled="componentCtx.creationMode"
            icon="i-lucide-plus"
            color="neutral"
            type="submit"
            class="w-fit lg:ms-auto"
            @click="componentCtx.creationMode = true"
        />
        </UPageCard>

        <div class="relative">
            <UCard 
                class="w-full max-w-4xl mx-auto"
                variant="subtle"
            >
                <template #header>
                    <span class="font-bold">{{ t('capture.existingEndpoints') }}</span>
                </template>
                <template #default>

                </template>
            </UCard>
        </div>

    </div>
</template>