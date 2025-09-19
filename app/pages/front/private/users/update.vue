<script setup lang="ts">
   import { useRoute } from 'vue-router';
   import { ref, computed } from 'vue';
   const { t } = useI18n();
   const nuxtApp = useNuxtApp();

   const route = useRoute();
   const userId = ref(route.query.login || null);

   let hookFn: any = (login: string) => {
        userId.value=login;
   };

   onMounted(() => {
      nuxtApp.hook("usermng:clickId" as any, hookFn);
   });

   onUnmounted(() => {
      nuxtApp.hooks.removeHook("usermng:clickId" as any, hookFn);
   });

</script>

<template>
    <UPageCard
      :title="$t('useradm.updateUserTitle')"
      :description="$t('useradm.updateUserDesc')"
      variant="subtle"
      class="flex-1"
    >
        <UsersAdminSearch v-if="userId===null" :displayed="2"/>
        <UsersAdminForm v-else :login="userId"/>
    </UPageCard>

</template>