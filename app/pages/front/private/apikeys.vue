<script setup lang="ts">
    import { ref, computed, reactive } from 'vue';
    import { type UserApiTokenCreationBody, type UserApiTokenResponse } from '~/types';
    import { useClipboard } from '@vueuse/core'

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'apiKeyConfiguration' }});

    const { t } = useI18n();
    const nuxtApp = useNuxtApp();
    const toast = useToast();
    const { $formatDuration } = useNuxtApp();
    const appStore = applicationStore();

    const { copy, copied } = useClipboard()

    type ApiKeyTableLine = {
        id : string;
        keyName: string;
        expirationDate: string;
        getJWTAction: any;
        deleteAction: any;
    };


    const componentCtx = reactive({
        creationMode: false as boolean,
        canCreate: false as boolean,
        duration: 0 as number,
        durationString: "" as string,
        newApiKey: {
            keyName : "",
            expiration: 0,
            roles: [],
            acls: [],
        } as UserApiTokenCreationBody,
        apiKeys: [] as UserApiTokenResponse[],
        apiKeysLines: [] as ApiKeyTableLine[],
        apiKeyListError: null as string | null,
        apiCreationError : null as string | null,
        apiKeyLoading: false as boolean,
        apiKeysLinesVisibility : {
            id: false,
        },
        apiKeyDeleteConfirmLayer: false as boolean,
        apiKeyToDelete: null as string | null,
        showJwt: null as string | null,
    });

    // =======================================================
    // API KEY LISTING
    // =======================================================


    const loadApiKeyList = () => {
        componentCtx.apiKeyListError = null;
        componentCtx.apiKeyLoading = true;
        
        nuxtApp.$apiBackendUsers.userModuleGetApiKeysList().then((res) => {
            if (res.success) {
                componentCtx.apiKeys = res.success;
                componentCtx.apiKeysLines = componentCtx.apiKeys.map( (key) => {
                    return {
                        id: key.id,
                        keyName: key.keyName,
                        expirationDate: new Date(key.expiration).toLocaleDateString(),
                        getJWTAction: null,
                        deleteAction: null,
                    } as ApiKeyTableLine;
                });
                componentCtx.apiKeyLoading = false;
            } else if ( res.error ) {
                componentCtx.apiKeyListError = t('login.' + res.error.message);
                componentCtx.apiKeyLoading = false;
                clearErrors();
            }        
        }).catch((err) => {
            componentCtx.apiKeyListError = t('common.unknownError');
            componentCtx.apiKeyLoading = false;
            clearErrors();
        });
    }

    onMounted(() => {
        loadApiKeyList();
    });

    // =======================================================
    // API KEY CREATION
    // =======================================================

    // Watch for changes in ApiKey form to authorize creation
    watch(() => componentCtx.newApiKey, (newVal) => {
        componentCtx.canCreate = !(!newVal.keyName || !newVal.expiration );
    }, { deep: true });

    // Converts a value (1–100) into a duration between 1 hour and 10 years (in seconds)
    // using an exponential progression for smoother scaling
    function mapValueToDuration(value: number): number {
        // Clamp value between 1 and 100
        const x = Math.min(Math.max(value, 1), 100)

        const min = 3600            // 1 hour in seconds
        const max = 315360000       // 10 years in seconds

        // Exponential interpolation
        const exponent = 5          // Controls steepness of curve (adjustable)
        const ratio = (x - 1) / 99  // Normalized value 0 → 1
        const scaled = Math.pow(ratio, exponent)

        return min + (max - min) * scaled
    }

    const onChangeDuration = () => {
        componentCtx.newApiKey.expiration = Math.floor(mapValueToDuration(componentCtx.duration));
        componentCtx.durationString = $formatDuration(componentCtx.newApiKey.expiration);
    }

    const onNewApiKeyCreation = () => {

        // update the expiration from Now
        let initExp = componentCtx.newApiKey.expiration;
        componentCtx.newApiKey.expiration *= 1000;
        componentCtx.newApiKey.expiration += Date.now();

        // Call the API to create the new API key
        nuxtApp.$apiBackendUsers.userModuleApiKeyCreation(componentCtx.newApiKey).then((res) => {
            if (res.success) {
                // Handle successful API key creation
                toast.add({
                    title: t('apiKeys.updateSuccessTitle'),
                    description: t('apiKeys.updateSuccessDesc'),
                    icon: 'i-lucide-arrow-big-up-dash',
                });
                // refresh the apikey list
                loadApiKeyList();
                componentCtx.creationMode = false;
            } else if ( res.error ) {
                componentCtx.apiCreationError = t('login.' + res.error.message);
                componentCtx.newApiKey.expiration = initExp;
                clearErrors();
            }        
        }).catch((err) => {
            componentCtx.apiCreationError = t('common.unknownError');
            componentCtx.newApiKey.expiration = initExp;
            clearErrors();
        });
    }

    const clearErrors = () => {
        setTimeout(() => {
            componentCtx.apiCreationError = null;
            componentCtx.apiKeyListError = null;
        }, 5000);
    }

    // =======================================================
    // Delete API KEY
    // =======================================================

    const onDeleteApiKey = (keyId: string) => {
        componentCtx.apiKeyDeleteConfirmLayer = true;
        componentCtx.apiKeyToDelete = keyId;
    }

    const onCancelDeleteApiKey = () => {
        componentCtx.apiKeyDeleteConfirmLayer = false;
        componentCtx.apiKeyToDelete = null;
    }

    const onConfirmDeleteApiKey = () => {
        componentCtx.apiKeyListError = null;

        nuxtApp.$apiBackendUsers.userModuleDeleteApiKey(componentCtx.apiKeyToDelete!).then((res) => {
            if (res.success) {
                // Handle successful API key deletion
                toast.add({
                    title: t('apiKeys.deleteSuccessTitle'),
                    description: t('apiKeys.deleteSuccessDesc'),
                    icon: 'i-lucide-arrow-big-up-dash',
                });
                // refresh the apikey list
                loadApiKeyList();
                componentCtx.apiKeyDeleteConfirmLayer = false;
                componentCtx.apiKeyToDelete = null;
            } else if ( res.error ) {
                componentCtx.apiKeyDeleteConfirmLayer = false;
                componentCtx.apiKeyListError = t('login.' + res.error.message);
                clearErrors();
            }        
        }).catch((err) => {
            componentCtx.apiKeyDeleteConfirmLayer = false;
            componentCtx.apiKeyListError = t('common.unknownError');
            clearErrors();
        });
    }

    const onGetApiKey = (keyId: string) => {
        componentCtx.apiKeyListError = null;
        nuxtApp.$apiBackendUsers.userModuleApikeyJwtGet(keyId).then((res) => {
            if (res.success) {
                componentCtx.showJwt = "Bearer "+res.success.message;
            } else if ( res.error ) {
                componentCtx.apiKeyListError = t('login.' + res.error.message);
                clearErrors();
            }        
        }).catch((err) => {
            componentCtx.apiKeyListError = t('common.unknownError');
            clearErrors();
        });
    }

</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-4xl mx-auto mb-4">

    <UPageCard
      :title="$t('apiKeys.gen_title')"
      :description="$t('apiKeys.gen_description')"
      variant="naked"
      orientation="horizontal"
      class="mb-4"
    >
      <UButton
        form="settings"
        :label="$t('apiKeys.create')"
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
                <span class="font-bold">{{ t('apiKeys.existingKeys') }}</span>
            </template>
            <template #default>
                <div class="relative">
                    <UTable 
                        :loading="componentCtx.apiKeyLoading" 
                        loading-color="primary" 
                        loading-animation="carousel" 
                        :data="componentCtx.apiKeysLines"
                        v-model:column-visibility="componentCtx.apiKeysLinesVisibility"
                        :empty="$t('apiKeys.noResults')"
                        sticky
                        class="flex-1 text-xs h-55"
                    >
                        <template #keyName-header>
                            <span class="font-bold">{{ t('apiKeys.keyName') }}</span>
                        </template>
                        <template #keyName-cell="{ row }">
                            <span>{{ row.original.keyName }}</span>
                        </template>

                        <template #expirationDate-header>
                            <span class="font-bold">{{ t('apiKeys.expiration') }}</span>
                        </template>
                        <template #expirationDate-cell="{ row }">
                            <span>{{ row.original.expirationDate }}</span>
                        </template>

                        <template #getJWTAction-header>
                            <span class="font-bold">{{ t('apiKeys.getJWT') }}</span>
                        </template>
                        <template #getJWTAction-cell="{ row }">
                            <UButton
                                :label="$t('apiKeys.get')"
                                class="capitalize w-25 justify-center"
                                size="xs"
                                variant="soft"
                                color="info"
                                @click="onGetApiKey(row.original.id)"
                            />
                        </template>

                        <template #deleteAction-header>
                            <span class="font-bold">{{ t('apiKeys.deleteKey') }}</span>
                        </template>
                        <template #deleteAction-cell="{ row }">
                            <UButton
                                :label="$t('apiKeys.delete')"
                                class="capitalize w-25 justify-center"
                                size="xs"
                                variant="soft"
                                color="error"
                                @click="onDeleteApiKey(row.original.id)"
                            />
                        </template>

                    </UTable>
                    <div v-if="componentCtx.apiKeyDeleteConfirmLayer"
                         class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
                    >
                        <div class="mb-2 text-sm text-center">
                            {{ t('apiKeys.deleteConfirmDesc') }}
                        </div>
                        <div class="flex gap-4">
                            <UButton icon="i-lucide-trash-2" variant="soft" color="error" @click="onConfirmDeleteApiKey()">
                                {{ t('apiKeys.deleteConfirm') }}
                            </UButton>
                            <UButton icon="i-lucide-circle-x" variant="soft" color="primary" @click="onCancelDeleteApiKey()">
                                {{ t('apiKeys.deleteCancel') }}
                            </UButton>
                        </div>
                    </div>
                </div>    
            </template>
        </UCard>
        <div v-if="componentCtx.apiKeyListError"
            class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            <div class="flex flex-col items-center gap-4">
                <div class="mb-2 text-lg text-center text-red-600 font-bold">
                    {{ componentCtx.apiKeyListError}}
                </div>
            </div>
        </div>
        <div v-if="componentCtx.showJwt"
            class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            <UCard
                :description="$t('apiKeys.jwtDesc')"
                class="m-4"
                >
                <template #header>
                    <div class="flex items-center justify-between w-full">
                        <span class="font-bold">
                            {{ t('apiKeys.jwtTitle') }}
                        </span>
                        <UButton
                            :label="$t('apiKeys.close')"
                            color="neutral"
                            type="submit"
                            size="xs"
                            @click="componentCtx.showJwt = null"
                        />
                    </div>
                </template>
                <template #default>
                    <div class="flex items-center justify-between w-full">
                        <span class="font-bold">
                            {{ t('apiKeys.jwtDesc') }}
                        </span>
                    </div>
                    <div class="flex items-center justify-between w-full">
                        <UTextarea size="xl" class="w-full" disabled :modelValue="componentCtx.showJwt">
                            <template v-if="componentCtx.showJwt?.length" #trailing>
                                <UTooltip :text="$t('apiKeys.copyToClipboard')" :content="{ side: 'right' }">
                                    <UButton
                                    :color="copied ? 'success' : 'neutral'"
                                    variant="link"
                                    size="sm"
                                    :icon="copied ? 'i-lucide-copy-check' : 'i-lucide-copy'"
                                    :aria-label="$t('apiKeys.copyToClipboard')"
                                    @click="copy(componentCtx.showJwt)"
                                    />
                                </UTooltip>
                            </template>
                        </UTextarea>
                    </div>
                </template>
            </UCard>
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
                        {{ t('apiKeys.createKey') }}
                    </span>

                    <UButton
                        :label="$t('apiKeys.createNow')"
                        :disabled="!componentCtx.canCreate"
                        color="neutral"
                        type="submit"
                        @click="onNewApiKeyCreation()"
                    />
                </div>
            </template>
            <template #default>
                <UForm
                    id="settings"
                    :state="componentCtx.newApiKey"
                    @submit="() => {}"
                >
                    <UFormField
                        name="keyName"
                        :label="$t('apiKeys.keyName')"
                        :description="$t('apiKeys.keyNameDesc')"
                        required
                        class="flex max-sm:flex-col justify-between items-start gap-4"
                    >
                        <UInput v-model="componentCtx.newApiKey.keyName" type="text" class="w-70" />
                    </UFormField>

                    <UFormField
                        name="expiration"
                        :label="$t('apiKeys.expiration')"
                        :description="$t('apiKeys.expirationDesc')"
                        required
                        class="flex max-sm:flex-col justify-between items-start gap-4 mt-2"
                    >
                        <USlider v-model="componentCtx.duration" :min="1" :max="100" class="w-70 mb-2" @change="onChangeDuration()" />
                        <span>{{ componentCtx.durationString }}</span>
                    </UFormField>

                    <UFormField
                        name="roles"
                        :label="$t('apiKeys.roles')"
                        :description="$t('apiKeys.rolesDesc')"
                        class="mt-2"
                    >
                        <UsersUserRoles :login="appStore.userLogin as string" :userRoles="componentCtx.newApiKey.roles" class="mt-2"/>
                    </UFormField>

                    <UFormField
                        name="groups"
                        :label="$t('apiKeys.groups')"
                        :description="$t('apiKeys.groupsDesc')"
                        class="mt-2"
                    >
                        <UsersUserApiKeyAcl :login="appStore.userLogin as string" :keyAcls="componentCtx.newApiKey.acls" class="mt-2"/>
                    </UFormField>

                </UForm>
            </template>
        </UCard>
        <div v-if="componentCtx.apiCreationError"
            class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            <div class="flex flex-col items-center gap-4">
                <div class="mb-2 text-lg text-center text-red-600 font-bold">
                    {{ componentCtx.apiCreationError}}
                </div>
            </div>
        </div>
    </div>

    </div>

</template>