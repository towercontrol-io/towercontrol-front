<template>
    <UPageCard
      :title="$t('tickets.contactFormTitle')"
      :description="$t('tickets.contactFormDescription')"
      variant="subtle"
    >
      <TicketsContactForm />
    </UPageCard>
</template>

<script lang="ts" setup>
   definePageMeta({layout: 'centered-form'});
</script>

