<script setup lang="ts">
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';
    import type { NavigationMenuItem } from '@nuxt/ui';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'userAdmin' }});

    const { t } = useI18n();
    const router = useRouter();
    const appStore = applicationStore();
    const config = useRuntimeConfig();


    // ----
    // Main interface behavior
    const userData = reactive({
        open : false as boolean,
    });


    /**
     * Toolbar tab menus
     */
    const toolBarMenu = computed<NavigationMenuItem[][]>(() => [
      [
        { label: `${t('useradm.general')}`, icon: 'i-lucide-user-cog', to: '/front/private/users', exact: true, onSelect: () => {userData.open = false} },
        { label: `${t('useradm.create')}`, icon: 'i-lucide-user-plus', to: '/front/private/users/new', onSelect: () => {userData.open = false}  },
        { label: `${t('useradm.modify')}`, icon: 'i-lucide-user-pen', to: '/front/private/users/update', onSelect: () => {userData.open = false}  },
      ]
    ]);

</script> 

<template>
        <UDashboardToolbar v-model:open="userData.open">
          <UNavigationMenu :items="toolBarMenu" highlight class="-mx-1 flex-1" />
        </UDashboardToolbar>
        <div class="flex flex-row gap-4 sm:gap-6 lg:gap-12 w-auto mx-3">
          <NuxtPage />
        </div>
</template>