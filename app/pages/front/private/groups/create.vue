<script setup lang="ts">
   import { useRoute } from 'vue-router';
   import { ref, computed } from 'vue';

   definePageMeta({layout: 'main-layout', layoutProps: { title: 'groupCreation' }});


   const { t } = useI18n();
   const nuxtApp = useNuxtApp();

   const route = useRoute();
   const parentId = ref(route.query.parent || null);

</script>

<template>

groupe creation page - parent : {{ parentId }}

</template>