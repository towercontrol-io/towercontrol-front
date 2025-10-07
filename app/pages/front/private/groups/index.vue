<script setup lang="ts">
   import { useRoute } from 'vue-router';
   import { ref, computed } from 'vue';

   definePageMeta({layout: 'main-layout', layoutProps: { title: 'groupConfiguration' }});


   const { t } = useI18n();
   const nuxtApp = useNuxtApp();

   const route = useRoute();
   const groupId = ref(route.query.group || null);

</script>

<template>

group configuration page - groupId : {{ groupId }}

</template>