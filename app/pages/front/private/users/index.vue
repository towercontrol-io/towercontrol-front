<script setup lang="ts">
    const { t } = useI18n();
   
</script>
<template>
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
    <UPageCard
      :title="$t('useradm.purgatoryTitle')"
      :description="$t('useradm.purgatoryDesc')"
      variant="subtle"
    >
        <UsersAdminPurgatory />
    </UPageCard>
    <UPageCard
      :title="$t('useradm.lastRegisterTitle')"
      :description="$t('useradm.lastRegisterDesc')"
      variant="subtle"
    >
        last registered users
    </UPageCard>
    <UPageCard
      :title="$t('useradm.searchTitle')"
      :description="$t('useradm.searchDesc')"
      variant="subtle"
      class="lg:col-span-2"
    >
        <UsersAdminSearch />
    </UPageCard>
    </div>
</template>