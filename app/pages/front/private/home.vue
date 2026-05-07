<script setup lang="ts">
    import { applicationStore } from '~/stores/app';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'home' }});

    const { t } = useI18n();
    const appStore = applicationStore();

    const featureCards = computed(() => [
        {
            icon: 'i-lucide-cpu',
            title: t('home.devicesTitle'),
            description: t('home.devicesDesc'),
            color: 'primary' as const,
        },
        {
            icon: 'i-lucide-shield-check',
            title: t('home.securityTitle'),
            description: t('home.securityDesc'),
            color: 'success' as const,
        },
        {
            icon: 'i-lucide-life-buoy',
            title: t('home.supportTitle'),
            description: t('home.supportDesc'),
            color: 'warning' as const,
        },
        {
            icon: 'i-lucide-settings-2',
            title: t('home.adaptableTitle'),
            description: t('home.adaptableDesc'),
            color: 'info' as const,
        },
    ]);

    const quickLinks = computed(() => [
        { icon: 'i-lucide-user-circle', label: t('home.linkProfile'), desc: t('home.linkProfileDesc'), to: '/front/private/profile' },
        { icon: 'i-lucide-radio', label: t('home.linkEndpoints'), desc: t('home.linkEndpointsDesc'), to: '/front/private/endpoints' },
        { icon: 'i-lucide-key-round', label: t('home.linkApiKeys'), desc: t('home.linkApiKeysDesc'), to: '/front/private/apikeys' },
        { icon: 'i-lucide-layers', label: t('home.linkGroups'), desc: t('home.linkGroupsDesc'), to: '/front/private/groups/create' },
    ]);
</script>

<template>
    <div class="flex flex-col gap-8 p-4 sm:p-6 max-w-6xl mx-auto w-full">

        <!-- Hero banner -->
        <UCard variant="soft" class="relative overflow-hidden">
            <div class="absolute inset-0 pointer-events-none opacity-10 dark:opacity-5">
                <svg viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                    <circle cx="50" cy="100" r="6" class="fill-primary-500" />
                    <circle cx="200" cy="60" r="4" class="fill-primary-400" />
                    <circle cx="360" cy="130" r="5" class="fill-primary-500" />
                    <circle cx="520" cy="70" r="4" class="fill-primary-400" />
                    <circle cx="680" cy="120" r="6" class="fill-primary-500" />
                    <circle cx="750" cy="50" r="3" class="fill-primary-300" />
                    <line x1="50" y1="100" x2="200" y2="60" stroke="currentColor" stroke-width="1" class="stroke-primary-400" />
                    <line x1="200" y1="60" x2="360" y2="130" stroke="currentColor" stroke-width="1" class="stroke-primary-400" />
                    <line x1="360" y1="130" x2="520" y2="70" stroke="currentColor" stroke-width="1" class="stroke-primary-400" />
                    <line x1="520" y1="70" x2="680" y2="120" stroke="currentColor" stroke-width="1" class="stroke-primary-400" />
                    <line x1="680" y1="120" x2="750" y2="50" stroke="currentColor" stroke-width="1" class="stroke-primary-400" />
                </svg>
            </div>
            <div class="relative flex flex-col sm:flex-row items-center gap-6 py-4">
                <div class="flex-shrink-0">
                    <div class="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
                        <UIcon name="i-lucide-network" class="w-10 h-10 text-white" />
                    </div>
                </div>
                <div class="flex-1 text-center sm:text-left">
                    <h1 class="text-2xl sm:text-3xl font-bold text-highlighted mb-2">
                        {{ t('home.welcomeTitle') }}
                    </h1>
                    <p class="text-base text-muted max-w-2xl">
                        {{ t('home.welcomeSubtitle') }}
                    </p>
                </div>
                <div class="flex-shrink-0 hidden lg:flex items-center gap-2">
                    <UBadge color="success" variant="soft" size="lg" icon="i-lucide-circle-check">
                        {{ t('home.platformReady') }}
                    </UBadge>
                </div>
            </div>
        </UCard>

        <!-- Feature cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <UCard
                v-for="card in featureCards"
                :key="card.title"
                variant="subtle"
                class="flex flex-col gap-3"
            >
                <template #header>
                    <div class="flex items-center gap-3">
                        <div :class="`w-10 h-10 rounded-xl bg-${card.color}/10 flex items-center justify-center`">
                            <UIcon :name="card.icon" :class="`w-5 h-5 text-${card.color}`" />
                        </div>
                        <span class="font-semibold text-highlighted text-sm">{{ card.title }}</span>
                    </div>
                </template>
                <p class="text-sm text-muted leading-relaxed">{{ card.description }}</p>
            </UCard>
        </div>

        <!-- Quick links -->
        <div>
            <h2 class="text-lg font-semibold text-highlighted mb-4 flex items-center gap-2">
                <UIcon name="i-lucide-zap" class="w-5 h-5 text-primary" />
                {{ t('home.quickLinksTitle') }}
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <NuxtLink
                    v-for="link in quickLinks"
                    :key="link.to"
                    :to="link.to"
                    class="group"
                >
                    <UCard variant="outline" class="transition-all duration-150 group-hover:ring-primary group-hover:shadow-md cursor-pointer">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                                <UIcon :name="link.icon" class="w-5 h-5 text-primary" />
                            </div>
                            <div class="flex-1 min-w-0">
                                <div class="font-medium text-sm text-highlighted">{{ link.label }}</div>
                                <div class="text-xs text-muted truncate">{{ link.desc }}</div>
                            </div>
                            <UIcon name="i-lucide-chevron-right" class="w-4 h-4 text-muted group-hover:text-primary transition-colors flex-shrink-0" />
                        </div>
                    </UCard>
                </NuxtLink>
            </div>
        </div>

    </div>
</template>

