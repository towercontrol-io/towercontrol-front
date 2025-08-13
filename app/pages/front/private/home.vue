<script setup lang="ts">
    import { applicationStore } from '~/stores/app';
    import { useRouter } from 'vue-router';

    definePageMeta({layout: 'main-layout', layoutProps: { title: 'home' }});

    const { t } = useI18n();
    const router = useRouter();
    const appStore = applicationStore();

</script>

<template>
    my home page  <br/> <a href="/front/public/login">login</a>
</template>

