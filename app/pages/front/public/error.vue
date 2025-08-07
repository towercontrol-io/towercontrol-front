<!-- app/error.vue -->
<script setup lang="ts">
    import { useRouter } from 'vue-router';

    definePageMeta({layout: 'centered-form'});
    const { t } = useI18n();
    const config = useRuntimeConfig()
    const logoImage : string = config.public.LOGO_MAIN as string;
    const serviceName : string = config.public.SERVICE_NAME as string;
    const router = useRouter();
    const route = useRoute();

    const error = route.query.error
      ? JSON.parse(decodeURIComponent(route.query.error as string))
      : null;

    function goHome() {
        router.push('/front/private/home')
    }
</script>

<template>
    <UCard variant="outline" align="center" style="border-radius: 1.5rem;padding: 1rem;min-width:25rem;">
        <template #header>
            <div class="flex flex-col items-center space-y-2">
                <img :src="logoImage" alt="Service Logo" class="h-16 w-auto sm:h-20 md:h-24" />
                <h2 class="text-xl font-semibold text-center text-neutral" >
                    {{serviceName}} 
                </h2>
            </div>
        </template>

        <div class="text-center mb-4">
            <p class="text-lg text-neutral">
                {{ error?.message || $t('common.unknownError') }}
            </p>
        </div>

        <UButton color="primary" @click="goHome">
        {{ $t('common.goHome') }}
        </UButton>
    </UCard>
</template>
