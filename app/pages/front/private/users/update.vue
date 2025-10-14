<script setup lang="ts">
   import { useRoute } from 'vue-router';
   import { ref, computed } from 'vue';
   import type { AccordionItem } from '@nuxt/ui'

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

   const items = ref<AccordionItem[]>([
      {
        label: t('useradm.updateUserRolesTitle'),
        icon: 'i-lucide-rotate-ccw-key',
        content: t('useradm.updateUserRolesDesc')
      },{
        label: t('useradm.updateUserGroupTitle'),
        icon: 'i-lucide-square-stack',
        content: t('useradm.updateUserGroupDesc')
      },{
        label: t('useradm.updateUserAclsTitle'),
        icon: 'i-lucide-folder-key',
        content: t('useradm.updateUserAclsDesc')
      }
   ]);

</script>


<template>
    <UPageCard
      :title="$t('useradm.updateUserTitle') + ((userId!=null)?' ( ' + userId + ' )':'')"
      :description="$t('useradm.updateUserDesc')"
      variant="subtle"
      class="flex-1"
    >
        <UsersAdminSearch v-if="userId===null" :displayed="2"/>
        <UAccordion v-else :login="userId" :items="items">
           <template #body="{ item }">
              {{ item.content }}  
              <UsersAdminRolesForm v-if="item.label === t('useradm.updateUserRolesTitle')" :login="userId"/>
              <UsersAdminGroupsForm v-if="item.label === t('useradm.updateUserGroupTitle')" :login="userId"/>
              <UsersAdminAclsForm v-if="item.label === t('useradm.updateUserAclsTitle')" :login="userId"/>
           </template>
        </UAccordion>
    </UPageCard>

</template>