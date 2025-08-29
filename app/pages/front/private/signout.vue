<script setup lang="ts">
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';

    const router = useRouter();
    const { t } = useI18n();
    const appStore = applicationStore();
    const { $apiBackendUsers } = useNuxtApp();

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'signout' }});


    const errorStr = reactive({
        value : undefined as string | undefined
    });

    onMounted(() => {
        // signout !
        errorStr.value = undefined;
        const res = $apiBackendUsers.userModuleSignoutGet().then((res) => {
            if (res.success) {
                appStore.clearStore(); // Clear the store
                $apiBackendUsers.clearCache(); // Clear the user cache
                router.push('/front/public/login');
            } else if (res.error) {
                errorStr.value = t('login.' + res.error.message);
            }
        }).catch((err) => {
            errorStr.value = t('profile.signoutError');
        });
    });

</script>

<template>
    <UPageCard v-if="errorStr.value!== undefined"
      :title="$t('profile.signout')"
      :description="errorStr.value"
      variant="outline"
      highlight
      highlight-color="error"
      class="mt-4 ml-10 mr-10 w-auto justify-center"
    />
</template>

