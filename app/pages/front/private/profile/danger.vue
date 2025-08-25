<script setup lang="ts">
    import { reactive } from 'vue';
    import { type ActionResult } from '~/types';
    import type { UserConfigResponse } from '~/types';


    const { t } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    const config = useRuntimeConfig();
    const appStore = applicationStore();
    const router = useRouter();

    const enableImmediateDeletion : boolean = config.public.ENABLE_DANGER_DELETE_ACCOUNT as boolean;

    // -----
    // Load the user module configuration data to adapt the page to the configuration
    const { data : userConfig, pending, error, refresh } = useAsyncData<UserConfigResponse>(
        () => `user-config-response`, 
        () => $apiBackendUsers.getUserModuleConfig()
    );

    const dangerEnabled : boolean = config.public.ENABLE_DANGER_FEATURES as boolean;
    if ( !dangerEnabled ) router.push('/front/private/home');

    const deletionDays : number = userConfig && userConfig.value && userConfig.value?.deletionPurgatoryDelayHours > 0 ? Math.ceil(userConfig.value?.deletionPurgatoryDelayHours / 24) : 0;

    const onDeactivation = () => {
        $apiBackendUsers.deleteUserLogicalRequest()
           .then( (res) => {
            if (res.success) {
                // Signout the user
                appStore.setBackendJWT(''); // Clear the JWT token from the store
                appStore.setRefreshJWT(''); // Clear the refresh token from the store
                router.push('/front/public/login');
            } else if (res.error) {
                // Should not happen, but...
            }
        }).catch( (err) => {
            // Should not happen, but...
        });
    };

</script>

<template>
    <UPageCard
      :title="$t('profile.danger_title')"
      :description="$t('profile.danger_description')"
      variant="naked"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard v-if="userConfig && userConfig.deletionPurgatoryDelayHours > 0"
      :title="$t('profile.danger_deactivationTitle')"
      :description="$t('profile.danger_deactivationDesc')"
      variant="subtle"
      highlight
      highlight-color="error"
    >
      <span v-if="deletionDays > 0"> 
        {{ $t('profile.danger_deletionDelayDays', { days: deletionDays })}} 
      </span>
      <span v-if="deletionDays == 0"> 
        {{ $t('profile.danger_deletionDelayHours', { hours: userConfig.deletionPurgatoryDelayHours })}} 
      </span>
      <span>
        {{ $t('profile.danger_loginRef', { login: appStore.getUserLogin() })}} 
      </span>
      <UButton
        :label="$t('profile.danger_deactivation')"
        color="error"
        type="submit"
        class="w-fit lg:ms-auto"
        @click="onDeactivation()"
      />
    </UPageCard>

    <UPageCard v-if="enableImmediateDeletion"
      :title="$t('profile.danger_deletionTitle')"
      :description="$t('profile.danger_deletionDesc')"
      variant="subtle"
      highlight
      highlight-color="error"
    >
      <UButton
        :label="$t('profile.danger_deletion')"
        color="error"
        type="submit"
        class="w-fit lg:ms-auto"
      />
    </UPageCard>


</template>