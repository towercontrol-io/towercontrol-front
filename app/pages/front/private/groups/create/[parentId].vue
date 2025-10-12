<script setup lang="ts">
   import { useRoute } from 'vue-router';
   import { ref, computed } from 'vue';

   definePageMeta({layout: 'main-layout', layoutProps: { title: 'groupCreation' }});


   const { t } = useI18n();
   const nuxtApp = useNuxtApp();

   const route = useRoute();
   let parentId = "";
   if ( route.params.parentId && route.params.parentId !== 'root' ) {
      parentId = route.params.parentId as string;
   } 
</script>

<template>
   <GroupsCreate :parentId="parentId"/>
</template>