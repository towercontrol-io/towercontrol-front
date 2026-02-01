<script setup lang="ts">
   import { useRoute } from 'vue-router';
   import { ref, computed } from 'vue';

   definePageMeta({layout: 'main-layout', layoutProps: { title: 'ticketAdvEdition' }});


   const { t } = useI18n();
   const nuxtApp = useNuxtApp();

   const route = useRoute();
   let ticketId = "" as string;
   if ( route.params.ticketId ) {
      ticketId = route.params.ticketId as string;
   } 
</script>

<template>
  <div>
    test {{ ticketId }}
  </div>
</template>
