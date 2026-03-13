<template>
    <UPageCard
      :title="hasRequiredParams ? $t('tickets.contactViewTitle')+' #' + ticketId : $t('tickets.contactViewMissingParamsTitle')"
      :description="$t(hasRequiredParams ? 'tickets.contactViewDescription' : 'tickets.contactViewMissingParamsDescription')"
      :variant="hasRequiredParams ? 'subtle' : 'outline'"
      :highlight="!hasRequiredParams"
      :highlight-color="!hasRequiredParams ? 'error' : undefined"
    >
      <TicketsTicketContent
        v-if="hasRequiredParams"
        :ticketId="Number(ticketId)"
        :ticket="undefined"
        :is-admin="false"
        :auth-key="accessKey"
      />
    </UPageCard>
</template>

<script lang="ts" setup>
   definePageMeta({layout: 'centered-form'});

   const route = useRoute();
   const ticketId = route.query.ticketId as string | undefined;
   const accessKey = route.query.accessKey as string | undefined;
   const hasRequiredParams = computed(() => Boolean(ticketId && accessKey));

</script>
