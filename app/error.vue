<!-- app/error.vue -->
<script setup lang="ts">
    import { useRouter } from 'vue-router';

    const props = defineProps<{ error: any }>();
    const router = useRouter();
    router.push({
        path: '/front/error',
        query: { error: encodeURIComponent(JSON.stringify(props.error)) }
        });
</script>

<template>
</template>