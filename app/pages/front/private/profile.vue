<script setup lang="ts">
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';
    import type { NavigationMenuItem } from '@nuxt/ui';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'profile' }});

    const { t } = useI18n();
    const router = useRouter();
    const appStore = applicationStore();
    const config = useRuntimeConfig();
    const billingEnabled : boolean = config.public.ENABLE_BILLING_FEATURES as boolean;
    const dangerEnabled : boolean = config.public.ENABLE_DANGER_FEATURES as boolean;


    // ----
    // Main interface behavior
    const profileData = reactive({
        open : false as boolean,
    });


    /**
     * Toolbar tab menus
     */
    const toolBarMenu = computed<NavigationMenuItem[][]>(() => [
      [
        { label: `${t('profile.tb_general')}`, icon: 'i-lucide-user', to: '/front/private/profile', exact: true, onSelect: () => {profileData.open = false} },
        { label: `${t('profile.tb_security')}`, icon: 'i-lucide-shield-user', to: '/front/private/profile/security', onSelect: () => {profileData.open = false}  },
        { label: `${t('profile.tb_billing')}`, icon: 'i-lucide-shopping-cart', to: '/front/private/profile/billing', onSelect: () => {profileData.open = false}, disabled: !billingEnabled  },
        { label: `${t('profile.tb_zdanger')}`, icon: 'i-lucide-skull', to: '/front/private/profile/danger', onSelect: () => {profileData.open = false}, disabled: !dangerEnabled  }
      ]
    ]);

</script> 

<template>
        <UDashboardToolbar v-model:open="profileData.open">
          <UNavigationMenu :items="toolBarMenu" highlight class="-mx-1 flex-1" />
        </UDashboardToolbar>
        <div class="flex flex-col gap-4 sm:gap-6 lg:gap-12 w-full lg:max-w-2xl mx-auto">
          <NuxtPage />
        </div>
</template>