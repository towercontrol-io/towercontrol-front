<script setup lang="ts">
    import { ref, computed, reactive, watch, watchEffect } from 'vue';
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';
    import type { TableRow } from '@nuxt/ui';
    import type { CaptureProtocolResponseItf, CaptureEndpointResponseItf, CaptureEndpointCreationBody } from '~/types';

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
        apiCreateError: null as string | null,
        apiProtLoading: false as boolean,
        apiEndpLoading: false as boolean,
        protocolList: [] as CaptureProtocolResponseItf[],
        endpointList: [] as CaptureEndpointResponseItf[],
        selectedProtocolFamily: '' as string,
        selectedProtocolType: '' as string,
        selectedProtocolVersion: '' as string,
        selectedProtocol: null as CaptureProtocolResponseItf | null,
        mandatoryFieldValidity: {} as Record<string, boolean>,
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
        newEndPoint : {
            name: '',
            description: '',
            encrypted: false,
            protocolId: '',
            forceWideOpen: false,
            customConfig: [],
        } as CaptureEndpointCreationBody,
    });

   const clearErrors = () => {
        setTimeout(() => {
            componentCtx.apiLoadError = null;
            componentCtx.apiDelError = null;
            componentCtx.apiCreateError = null;
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

    const mandatoryFields = computed(() => componentCtx.selectedProtocol?.mandatoryFields ?? []);

    const getCustomConfigValue = (name: string) : string => {
        const existing = componentCtx.newEndPoint.customConfig.find((field) => field.name === name);
        return existing?.value ?? '';
    };

    const setCustomConfigValue = (name: string, value: string) => {
        const existing = componentCtx.newEndPoint.customConfig.find((field) => field.name === name);
        if ( existing ) {
            existing.value = value;
            return;
        }

        componentCtx.newEndPoint.customConfig.push({ name, value });
    };

    const setCustomConfigValidity = (name: string, isValid: boolean) => {
        componentCtx.mandatoryFieldValidity[name] = isValid;
    };

    const canCreate = computed(() => {
        if (!componentCtx.newEndPoint.name?.trim()) {
            return false;
        }
        if (!componentCtx.newEndPoint.description?.trim()) {
            return false;
        }
        if (!componentCtx.newEndPoint.protocolId) {
            return false;
        }

        return mandatoryFields.value.every((field) => componentCtx.mandatoryFieldValidity[field.name]);
    });

    const protocolFamilyOptions = computed(() => {
        const families = new Set(
            componentCtx.protocolList
                .map((protocol) => protocol.protocolFamily)
                .filter((family) => !!family),
        );

        return Array.from(families).map((family) => ({
            label: t(`capture.${family}`),
            value: family,
        }));
    });

    const protocolTypeOptions = computed(() => {
        if ( !componentCtx.selectedProtocolFamily ) {
            return [];
        }

        const types = new Set(
            componentCtx.protocolList
                .filter((protocol) => protocol.protocolFamily === componentCtx.selectedProtocolFamily)
                .map((protocol) => protocol.protocolType)
                .filter((protocolType) => !!protocolType),
        );

        return Array.from(types).map((protocolType) => ({
            label: t(`capture.${protocolType}`),
            value: protocolType,
        }));
    });

    const protocolVersionOptions = computed(() => {
        if ( !componentCtx.selectedProtocolFamily || !componentCtx.selectedProtocolType ) {
            return [];
        }

        const versions = new Set(
            componentCtx.protocolList
                .filter((protocol) =>
                    protocol.protocolFamily === componentCtx.selectedProtocolFamily
                    && protocol.protocolType === componentCtx.selectedProtocolType,
                )
                .map((protocol) => protocol.protocolVersion)
                .filter((protocolVersion) => !!protocolVersion),
        );

        return Array.from(versions).map((protocolVersion) => ({
            label: t(`capture.${protocolVersion}`),
            value: protocolVersion,
        }));
    });

    watch(
        () => componentCtx.selectedProtocolFamily,
        () => {
            componentCtx.selectedProtocolType = '';
            componentCtx.selectedProtocolVersion = '';
            componentCtx.selectedProtocol = null;
            componentCtx.newEndPoint.protocolId = '';
        },
    );

    watch(
        () => componentCtx.selectedProtocolType,
        () => {
            componentCtx.selectedProtocolVersion = '';
            componentCtx.selectedProtocol = null;
            componentCtx.newEndPoint.protocolId = '';
        },
    );

    watch(
        () => componentCtx.selectedProtocolVersion,
        () => {
            if ( !componentCtx.selectedProtocolFamily
                || !componentCtx.selectedProtocolType
                || !componentCtx.selectedProtocolVersion ) {
                componentCtx.selectedProtocol = null;
                componentCtx.newEndPoint.protocolId = '';
                return;
            }

            const matchedProtocol = componentCtx.protocolList.find(
                (protocol) => protocol.protocolFamily === componentCtx.selectedProtocolFamily
                    && protocol.protocolType === componentCtx.selectedProtocolType
                    && protocol.protocolVersion === componentCtx.selectedProtocolVersion,
            );

            componentCtx.selectedProtocol = matchedProtocol ?? null;
            componentCtx.newEndPoint.protocolId = matchedProtocol?.id ?? '';
        },
    );

    watch(
        () => componentCtx.selectedProtocol?.id,
        () => {
            componentCtx.newEndPoint.customConfig = [];
            componentCtx.mandatoryFieldValidity = {};
        },
    );


    // =======================================================
    // ENDPOINT LIST
    // =======================================================
   const loadEndpointList = () => {
        componentCtx.apiLoadError = null;
        componentCtx.endpointList = [];
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

    // =======================================================
    // ENDPOINT CREATION
    // =======================================================

    const onNewEndpointCreation = () => {
        componentCtx.apiCreateError = null;
        nuxtApp.$apiBackendCapture.captureModuleEndpointCreation(componentCtx.newEndPoint).then( (res) => {
            if (res.success) {
                // Handle successful API key creation
                toast.add({
                    title: t('capture.createSuccessTitle'),
                    description: t('capture.createSuccessDesc'),
                    icon: 'i-lucide-arrow-big-up-dash',
                });
                // refresh the endpoint list
                loadEndpointList();
                componentCtx.selectedProtocolFamily= '';
                componentCtx.selectedProtocolType = '';
                componentCtx.selectedProtocolVersion = '';
                componentCtx.selectedProtocol =  null;
                componentCtx.mandatoryFieldValidity =  {} as Record<string, boolean>;
                componentCtx.newEndPoint = {
                    name: '',
                    description: '',
                    encrypted: false,
                    protocolId: '',
                    forceWideOpen: false,
                    customConfig: [],
                } as CaptureEndpointCreationBody;
                componentCtx.creationMode = false;
            } else if ( res.error ) {
                componentCtx.apiCreateError = t('capture.' + res.error.message);
                componentCtx.newEndPoint = {} as CaptureEndpointCreationBody;
                clearErrors();
            }        
        }).catch((err) => {
            componentCtx.apiCreateError = t('capture.errorCreatingEndpoint');
            componentCtx.newEndPoint = {} as CaptureEndpointCreationBody;
            clearErrors();
        })
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
                                <UTooltip :text="row.original.description">
                                    <span class="block max-w-[12rem] whitespace-normal break-words line-clamp-2">
                                       {{ row.original.name }}
                                    </span>
                                </UTooltip>
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

        <div class="relative"  v-if="componentCtx.creationMode" >
            <UCard 
            class="w-full max-w-4xl mx-auto"
            variant="subtle"
            >
                <template #header>
                    <div class="flex items-center justify-between w-full">
                        <span class="font-bold">
                            {{ t('capture.createEndpoint') }}
                        </span>

                        <UButton
                            :label="$t('capture.createNow')"
                            :disabled="canCreate === false"
                            color="neutral"
                            type="submit"
                            @click="onNewEndpointCreation()"
                        />
                    </div>
                </template>
                <template #default>
                    <UForm
                        id="settings"
                        :state="componentCtx.newEndPoint"
                        @submit="() => {}"
                    >
                        <UFormField
                            name="name"
                            :label="$t('capture.endpName')"
                            :description="$t('capture.endpNameDesc')"
                            required
                            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2"
                        >
                            <UInput v-model="componentCtx.newEndPoint.name" type="text" class="w-70" />
                        </UFormField>

                        <UFormField
                            name="description"
                            :label="$t('capture.endpDescription')"
                            :description="$t('capture.endpDescriptionDesc')"
                            required
                            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2"
                        >
                            <UTextarea v-model="componentCtx.newEndPoint.description" type="text" class="w-70" />
                        </UFormField>

                        <UFormField
                            name="encrypted"
                            :label="$t('capture.endpEncryption')"
                            :description="$t('capture.endpEncryptionDesc')"
                            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2"
                        >
                            <UCheckbox v-model="componentCtx.newEndPoint.encrypted" color="neutral" class="w-70"/>
                        </UFormField>

                        <UFormField
                            name="forceWideOpen"
                            :label="$t('capture.endpWideOpen')"
                            :description="$t('capture.endpWideOpenDesc')"
                            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2"
                        >
                            <UCheckbox v-model="componentCtx.newEndPoint.forceWideOpen" color="neutral" class="w-70"/>
                        </UFormField>


                        <UFormField
                            name="protocolFamily"
                            :label="$t('capture.endpProtocolFamily')"
                            :description="$t('capture.endpProtocolFamilyDesc')"
                            required
                            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2"
                        >
                            <USelectMenu
                                v-model="componentCtx.selectedProtocolFamily"
                                :items="protocolFamilyOptions"
                                value-key="value"
                                label-key="label"
                                :searchable="true"
                                class="w-70"
                            />
                        </UFormField>

                        <UFormField
                            name="protocolType"
                            :label="$t('capture.endpProtocolType')"
                            :description="$t('capture.endpProtocolTypeDesc')"
                            required
                            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2"
                        >
                            <USelectMenu
                                v-model="componentCtx.selectedProtocolType"
                                :items="protocolTypeOptions"
                                value-key="value"
                                label-key="label"
                                :searchable="true"
                                :disabled="!componentCtx.selectedProtocolFamily"
                                class="w-70"
                            />
                        </UFormField>

                        <UFormField
                            name="protocolVersion"
                            :label="$t('capture.endpProtocolVersion')"
                            :description="$t('capture.endpProtocolVersionDesc')"
                            required
                            class="flex max-sm:flex-col justify-between items-start gap-4 mb-2"
                        >
                            <USelectMenu
                                v-model="componentCtx.selectedProtocolVersion"
                                :items="protocolVersionOptions"
                                value-key="value"
                                label-key="label"
                                :searchable="true"
                                :disabled="!componentCtx.selectedProtocolType"
                                class="w-70"
                            />
                        </UFormField>
                        <div v-if="componentCtx.selectedProtocol" class="w-70 ms-auto text-xs text-neutral-500 mb-2">
                            {{ t(`capture.${componentCtx.selectedProtocol.description}`) }}
                        </div>

                        <div v-if="mandatoryFields.length" class="mt-2">
                            <CaptureMandatoryFieldInput
                                v-for="field in mandatoryFields"
                                :key="field.name"
                                :field="field"
                                :model-value="getCustomConfigValue(field.name)"
                                @update:model-value="(value) => setCustomConfigValue(field.name, value)"
                                @update:valid="(isValid) => setCustomConfigValidity(field.name, isValid)"
                            />
                        </div>
                    </UForm>
                </template>
            </UCard>
            <div v-if="componentCtx.apiCreateError != null"
                class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
            >
                <div class="flex flex-col items-center gap-4">
                    <div class="mb-2 text-lg text-center text-red-600 font-bold">
                        {{ componentCtx.apiCreateError}}
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>
