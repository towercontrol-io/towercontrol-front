
<template>
</template>

<script setup lang="ts">
  import { applicationStore } from '~/stores/app'

  const appStore = applicationStore();
  const toast = useToast();
  const { t } = useI18n();

  
  watch(
     () => appStore.backendUp,
          (newVal) => {
            if (newVal === false) {
              toast.add({
                title: t('tools.toasterDisconnectedTitle'),
                description: t('tools.toasterDisconnectedMessage'),
                variant: 'danger',
                color: 'error',
                icon: 'mdi-alert-circle-outline',
              });
            }
          }
  );

</script>
