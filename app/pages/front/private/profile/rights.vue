<script setup lang="ts">
    import { reactive } from 'vue';
    import { type ActionResult } from '~/types';
    import type { UserConfigResponse } from '~/types';

    const { t } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    


</script>
<template>
    <UPageCard
      :title="$t('profile.rights_title')"
      :description="$t('profile.rights_description')"
      variant="naked"
      class="mb-4"
    >
    </UPageCard>

    <UPageCard 
      :title="$t('profile.rights_roleTitle')"
      :description="$t('profile.rights_roleDesc')"
      variant="subtle"
    >
        <UsersRoles />
    </UPageCard>

    <UPageCard 
      :title="$t('profile.rights_groupTitle')"
      :description="$t('profile.rights_groupDesc')"
      variant="subtle"
    >
        <UsersGroups />
    </UPageCard>


</template>