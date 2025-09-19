<script setup lang="ts">
   const { t } = useI18n();
   const nuxtApp = useNuxtApp();
   const { $apiBackendUsers } = useNuxtApp();
    import { type ActionResult, type UserAccessibleRolesResponse } from '~/types';


   const props = defineProps({ 
      login: { type: String, required: true, default: '' },
   });


   const pageCtx = reactive({
        accessibleRoles : [] as UserAccessibleRolesResponse[],
        accessibleRolesLoading : false,
        accessibleRolesError : null as string | null,
    });

   /*
    * Get the available roles you can give to that user
    */
    const loadAvailableRoles = () => {
        pageCtx.accessibleRolesLoading = true;
        
        $apiBackendUsers.userModuleAffectableRoles().then((res) => {
            pageCtx.accessibleRolesLoading = false;
            if (res.success) {
                pageCtx.accessibleRoles = res.success.sort((a, b) => a.name.localeCompare(b.name));
                console.log(pageCtx.accessibleRoles);
            } else if (res.error) {
                pageCtx.accessibleRolesError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.accessibleRolesLoading = false;
            pageCtx.accessibleRolesError = t('common.unknownError');
        });
    }

    onMounted(() => {
        loadAvailableRoles();
    });


</script>

<template>
    {{ props.login }}

    {{ pageCtx.accessibleRolesError }}
</template>
