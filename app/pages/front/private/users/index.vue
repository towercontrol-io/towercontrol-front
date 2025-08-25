<script setup lang="ts">
    const { t } = useI18n();
   
</script>
<template>
    <UPageCard
      :title="$t('useradm.purgatoryTitle')"
      :description="$t('useradm.purgatoryDesc')"
      variant="subtle"
      class="basis-1/2"
    >
        <UsersAdminPurgatory />
    </UPageCard>
</template>