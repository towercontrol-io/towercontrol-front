<script setup lang="ts">
   import { ref, computed, reactive } from 'vue';
import UserRoles from '~/components/users/UserRoles.vue';
   import { type UserApiTokenCreationBody } from '~/types';

   definePageMeta({layout: 'main-layout', layoutProps: { title: 'apiKeyConfiguration' }});

   const { t } = useI18n();
   const nuxtApp = useNuxtApp();
   const toast = useToast();
   const { $formatDuration } = useNuxtApp();
   const appStore = applicationStore();

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
        apiCreationError : null as string | null,
    });

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
        }, 5000);
    }

</script>

<template>
    <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto mb-4">

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

    <UCard 
      class="w-full max-w-3xl mx-auto"
      variant="subtle"
    >
        <template #header>
            <span class="font-bold">{{ t('apiKeys.existingKeys') }}</span>
        </template>
        <template #default>
            api keys configuration page
        </template>
    </UCard>

    <div class="relative"  v-if="componentCtx.creationMode" >
        <UCard 
        class="w-full max-w-3xl mx-auto"
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