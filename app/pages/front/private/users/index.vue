<script setup lang="ts">
    import { onActivated, onDeactivated } from 'vue';
    const { t } = useI18n();   
    const nuxtApp = useNuxtApp();

    let hookFn: any = (login: string) => {
        navigateTo(`users/update?login=${encodeURIComponent(login)}`);
    };

    onMounted(() => {
      nuxtApp.hook("usermng:clickId" as any, hookFn);
    });

    onUnmounted(() => {
      nuxtApp.hooks.removeHook("usermng:clickId" as any, hookFn);
    });

</script>
<template>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <UPageCard
      :title="$t('useradm.purgatoryTitle')"
      :description="$t('useradm.purgatoryDesc')"
      variant="subtle"
    >
        <UsersAdminPurgatory />
    </UPageCard>
    <UPageCard
      :title="$t('useradm.lastRegisterTitle')"
      :description="$t('useradm.lastRegisterDesc')"
      variant="subtle"
    >
        <UsersAdminRecentRegistration />
    </UPageCard>
    <UPageCard
      :title="$t('useradm.searchTitle')"
      :description="$t('useradm.searchDesc')"
      variant="subtle"
      class="lg:col-span-2"
    >
        <UsersAdminSearch :displayed="30"/>
    </UPageCard>
    </div>
</template>