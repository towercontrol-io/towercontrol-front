<script setup lang="ts">
    import { ref, computed, reactive } from 'vue';
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';
    import type { TableRow } from '@nuxt/ui';
    import type { CaptureProtocolResponseItf, MandatoryField, CaptureEndpointResponseItf } from '~/types';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'endpointAdmin' }});

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const router = useRouter();
    const appStore = applicationStore();
    const config = useRuntimeConfig();
    const toast = useToast();
    const { $formatDuration } = useNuxtApp();

    const componentCtx = reactive({
        creationMode: false as boolean,

        apiLoadError: null as string | null,
        apiDelError: null as string | null,
        apiProtLoading: false as boolean,
        apiEndpLoading: false as boolean,
        protocolList: [] as CaptureProtocolResponseItf[],
        endpointList: [] as CaptureEndpointResponseItf[],
        endpointColumns : {
            id: false,
            customConfig: false,
            description: false,
            owner: false,
            totalFramesReceived : false,
            totalFramesAcceptedToPivot : false,
            totalInDriver : false,
            totalFramesAcceptedToProcess : false,
            totalQueuedToProcess : false,
            totalBadOwnerRefused : false,
            totalBadPayloadFormat : false,
            totalBadDeviceRight : false,
        },
        endpointExpanded: {} as Record<string, boolean>,
        endpointColOrder : [
            'ref',
            'name',
            'protocolId',
            'wideOpen',
            'encrypted',
            'creationMs',
            'deleteAction',
        ] as string[],
        deleteConfirmLayer: false as boolean,
        toBeDeletedId: '' as string,
    });

   const clearErrors = () => {
        setTimeout(() => {
            componentCtx.apiLoadError = null;
            componentCtx.apiDelError = null;
        }, 5000);
    }

    // =======================================================
    // PROTOCOL LIST
    // =======================================================
    const loadProtocolList = () => {
        componentCtx.apiLoadError = null;
        componentCtx.protocolList = [];
        componentCtx.apiProtLoading = true;

        nuxtApp.$apiBackendCapture.captureModuleGetProtocols().then((res) => {
            if ( res.success ) {
                componentCtx.protocolList = res.success as CaptureProtocolResponseItf[];
                componentCtx.apiProtLoading = false;
            } else if ( res.error ) {
                componentCtx.apiLoadError = t('capture.errorLoadingProtocols');
            }
        })
        .catch( ( err ) => {
            componentCtx.apiLoadError = t('capture.errorLoadingProtocols');
        });
    };

    const getPortocolNameFromId = ( protocolId : string ) : string => {
        if ( componentCtx.protocolList != null ) {
            for ( let i = 0 ; i < componentCtx.protocolList.length ; i++ ) {
                if ( componentCtx.protocolList[i]?.id == protocolId ) {
                    return t('capture.' + componentCtx.protocolList[i]!.description);
                }
            }
        }
        return t('capture.protoNotFound');
    };


    // =======================================================
    // ENDPOINT LIST
    // =======================================================
   const loadEndpointList = () => {
        componentCtx.apiLoadError = null;
        componentCtx.protocolList = [];
        componentCtx.apiEndpLoading = true;

        nuxtApp.$apiBackendCapture.captureModuleGetEndpoints().then((res) => {
            if ( res.success ) {
                componentCtx.endpointList = res.success as CaptureEndpointResponseItf[];
                componentCtx.endpointList.forEach( ( endp ) => {
                    endp.deleteAction = '';
                });
                componentCtx.apiEndpLoading = false;
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

    const onEndpointRowSelect = (row: TableRow<CaptureEndpointResponseItf>) => {
        row.toggleExpanded();
    };

    // =======================================================
    // ENDPOINT DELETE
    // =======================================================

    const onDelete = ( id : string ) => {
        componentCtx.deleteConfirmLayer = true; 
        componentCtx.toBeDeletedId = id;
    };

    const onCancelDelete = () => {
        componentCtx.deleteConfirmLayer = false;
        componentCtx.toBeDeletedId = '';
    };

    const onConfirmDelete = () => {
        componentCtx.apiDelError = null;

        nuxtApp.$apiBackendCapture.captureModuleDeleteEndpoint( componentCtx.toBeDeletedId )
        .then( ( res ) => {
            if ( res.success ) {
                // Handle successful API key deletion
                toast.add({
                    title: t('capture.deleteSuccessTitle'),
                    description: t('capture.deleteSuccessDesc'),
                    icon: 'i-lucide-arrow-big-up-dash',
                });
                // Reload the endpoint list
                loadEndpointList();
            } else if ( res.error ) {
                componentCtx.apiDelError = t('capture.'+res.error.message);
                clearErrors();
            }
        })
        .catch( ( err ) => {
            // Ignore errors for now
            componentCtx.apiDelError = t('capture.errorDeletingEndpoints');
            clearErrors();
        })
        .finally( () => {
            componentCtx.deleteConfirmLayer = false;
            componentCtx.toBeDeletedId = '';
        });
    };

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
                    <div class="relative">
                        <UTable 
                            :loading="componentCtx.apiProtLoading || componentCtx.apiEndpLoading" 
                            loading-color="primary" 
                            loading-animation="carousel" 
                            :data="componentCtx.endpointList"
                            v-model:column-visibility="componentCtx.endpointColumns"
                            v-model:column-order="componentCtx.endpointColOrder"
                            v-model:expanded="componentCtx.endpointExpanded"
                            :onSelect="onEndpointRowSelect"
                            :empty="$t('capture.noResults')"
                            sticky
                            class="flex-1 text-xs "
                        >
                            <template #ref-header>
                                <span class="font-bold">{{ t('capture.refCol') }}</span>
                            </template>
                            <template #ref-cell="{ row }">
                                <span>{{ row.original.ref }}</span>
                            </template>

                            <template #name-header>
                                <span class="font-bold">{{ t('capture.nameCol') }}</span>
                            </template>
                            <template #name-cell="{ row }">
                                <span class="block max-w-[12rem] whitespace-normal break-words line-clamp-2">
                                    {{ row.original.name }}
                                </span>
                            </template>

                            <template #description-header>
                                <span class="font-bold">{{ t('capture.descCol') }}</span>
                            </template>
                            <template #description-cell="{ row }">
                                <span>{{ row.original.description }}</span>
                            </template>

                            <template #protocolId-header>
                                <span class="font-bold">{{ t('capture.protoCol') }}</span>
                            </template>
                            <template #protocolId-cell="{ row }">
                                <span>{{ getPortocolNameFromId(row.original.protocolId) }}</span>
                            </template>

                            <template #wideOpen-header>
                                <span class="font-bold">{{ t('capture.wideCol') }}</span>
                            </template>
                            <template #wideOpen-cell="{ row }">
                                <UCheckbox v-model="row.original.wideOpen" disabled color="neutral"/>
                            </template>

                            <template #encrypted-header>
                                <span class="font-bold">{{ t('capture.encryptCol') }}</span>
                            </template>
                            <template #encrypted-cell="{ row }">
                                <UCheckbox v-model="row.original.encrypted" disabled color="neutral"/>
                            </template>

                            <template #creationMs-header>
                                <span class="font-bold">{{ t('capture.creationMsCol') }}</span>
                            </template>
                            <template #creationMs-cell="{ row }">
                                <UTooltip :popper="{ interactive: true }">
                                    <span class="cursor-help">
                                    {{ $formatDuration((Date.now() - row.original.creationMs) / 1000 )}}
                                    </span>

                                    <template #content>
                                    <span class="select-text cursor-text">
                                        {{ t('capture.creationBy', { owner: row.original.owner }) }}
                                    </span>
                                    </template>
                                </UTooltip>
                            </template>

                            <template #deleteAction-header>
                                <UIcon name="i-lucide-trash" class="w-4 h-4"/>
                            </template>
                            <template #deleteAction-cell="{ row }">
                                <UIcon name="i-lucide-trash" 
                                       class="w-4 h-4 text-error"
                                       variant="soft"
                                       @click.stop="onDelete(row.original.ref)"
                                />
                            </template>

                            <template #expanded="{ row }">
                                <div class="py-1">
                                    <span class="font-bold underline text-base mb-2 inline-block">{{ t('capture.endpointStats') }}</span>
                                    <table class="w-full text-sm border border-neutral-300/60 border-collapse">
                                        <thead>
                                            <tr class="text-left bg-secondary/5" >
                                                <UTooltip :text="t('capture.endpStatFrameRxDesc')">
                                                   <th class="font-bold px-2 py-1.5 border-r border-dotted border-neutral-300/60">{{ t('capture.totalFramesReceived') }}</th>
                                                </UTooltip>
                                                <UTooltip :text="t('capture.endpStatAccToPivotDesc')">
                                                    <th class="font-bold px-2 py-1.5 border-r border-dotted border-neutral-300/60">{{ t('capture.totalFramesAcceptedToPivot') }}</th>
                                                </UTooltip>
                                                <UTooltip :text="t('capture.endpStatInDriverDesc')">
                                                    <th class="font-bold px-2 py-1.5 border-r border-dotted border-neutral-300/60">{{ t('capture.totalInDriver') }}</th>
                                                </UTooltip>
                                                <UTooltip :text="t('capture.endpStatAccToProcDesc')">
                                                    <th class="font-bold px-2 py-1.5 border-r border-dotted border-neutral-300/60">{{ t('capture.totalFramesAcceptedToProcess') }}</th>
                                                </UTooltip>
                                                <UTooltip :text="t('capture.endpStatQToProcDesc')">
                                                    <th class="font-bold px-2 py-1.5 border-r border-dotted border-neutral-300/60">{{ t('capture.totalQueuedToProcess') }}</th>
                                                </UTooltip>
                                                <UTooltip :text="t('capture.endpStatOwnerDesc')">
                                                    <th class="font-bold px-2 py-1.5 border-r border-dotted border-neutral-300/60">{{ t('capture.totalBadOwnerRefused') }}</th>
                                                </UTooltip>
                                                <UTooltip :text="t('capture.endpStatPayloadDesc')">
                                                    <th class="font-bold px-2 py-1.5 border-r border-dotted border-neutral-300/60">{{ t('capture.totalBadPayloadFormat') }}</th>
                                                </UTooltip>
                                                <UTooltip :text="t('capture.endpStatRightDesc')">
                                                    <th class="font-bold px-2 py-1.5 border-dotted border-neutral-300/60">{{ t('capture.totalBadDeviceRight') }}</th>
                                                </UTooltip>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr class="text-right">
                                                <td class="text-success px-2 py-1 border-r border-dotted border-neutral-300/60">{{ row.original.totalFramesReceived }}</td>
                                                <td class="text-success px-2 py-1 border-r border-dotted border-neutral-300/60">{{ row.original.totalFramesAcceptedToPivot }}</td>
                                                <td class="text-success px-2 py-1 border-r border-dotted border-neutral-300/60">{{ row.original.totalInDriver }}</td>
                                                <td class="text-success px-2 py-1 border-r border-dotted border-neutral-300/60">{{ row.original.totalFramesAcceptedToProcess }}</td>
                                                <td class="text-success px-2 py-1 border-r border-dotted border-neutral-300/60">{{ row.original.totalQueuedToProcess }}</td>
                                                <td class="text-error px-2 py-1 border-r border-dotted border-neutral-300/60">{{ row.original.totalBadOwnerRefused }}</td>
                                                <td class="text-error px-2 py-1 border-r border-dotted border-neutral-300/60">{{ row.original.totalBadPayloadFormat }}</td>
                                                <td class="text-error px-2 py-1 border-dotted border-neutral-300/60">{{ row.original.totalBadDeviceRight }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </template>

                        </UTable>
                        <div v-if="componentCtx.deleteConfirmLayer"
                         class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div class="mb-2 text-sm text-center">
                            {{ t('capture.deleteConfirmDesc') }}
                        </div>
                        <div class="flex gap-4">
                            <UButton icon="i-lucide-trash-2" variant="soft" color="error" @click="onConfirmDelete()">
                                {{ t('capture.deleteConfirm') }}
                            </UButton>
                            <UButton icon="i-lucide-circle-x" variant="soft" color="primary" @click="onCancelDelete()">
                                {{ t('capture.deleteCancel') }}
                            </UButton>
                        </div>
                    </div>
                    </div>
                </template>
            </UCard>
            <div v-if="componentCtx.apiLoadError != null || componentCtx.apiDelError != null"
                class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
            >
                <div class="flex flex-col items-center gap-4">
                    <div class="mb-2 text-lg text-center text-red-600 font-bold">
                        {{ componentCtx.apiLoadError }} {{ componentCtx.apiDelError }}
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>
