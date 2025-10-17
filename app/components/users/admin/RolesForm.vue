<script setup lang="ts">
   import type { TableColumn } from '@nuxt/ui'
   import { type ActionResult, type UserAccessibleRolesResponse, type UserUpdateBodyResponse, type UserUpdateBody } from '~/types';

   const { t } = useI18n();
   const nuxtApp = useNuxtApp();
   const toast = useToast();
   const { $apiBackendUsers } = useNuxtApp();


   const props = defineProps({ 
      login: { type: String, required: true, default: '' },
   });

    type RoleLine = {
        roleName: string;
        roleDesc: string;
        isSet: boolean;
        isSettable: boolean;
    };


   const componentCtx = reactive({
        accessibleRoles : [] as UserAccessibleRolesResponse[],
        componentLoading : false,
        accessibleRolesError : null as string | null,
        accessibleRolesLoading : false,
        rolesLoadingError : null as string | null,
        rolesLoading : false,
        roles : undefined as UserUpdateBodyResponse | undefined,
        tableLines: [] as RoleLine[],
        loaded : 0 as number,
        rolesUpdateError : null as string | null,
    });


   /*
    * Get the available roles you can give to that user
    */
    const loadAvailableRoles = () => {
        componentCtx.accessibleRolesLoading = true;
        
        $apiBackendUsers.userModuleAffectableRoles().then((res) => {
            componentCtx.accessibleRolesLoading = false;
            if (res.success) {
                componentCtx.accessibleRoles = res.success.sort((a, b) => a.name.localeCompare(b.name));
                componentCtx.loaded++;
            } else if (res.error) {
                componentCtx.accessibleRolesError = t('login.'+res.error.message);
                clearErrors();
            }
        }).catch((err) => {
            componentCtx.accessibleRolesLoading = false;
            componentCtx.accessibleRolesError = t('common.unknownError');
            clearErrors();
        });
    }

    const loadRoles = () => {
        componentCtx.rolesLoading = true;
        componentCtx.rolesLoadingError = null;
        $apiBackendUsers.userModuleGetRightAndRoles(props.login,true,false,false,false).then((res) => {
            componentCtx.rolesLoading = false;
            if (res.success) {
                if ( res.success.considerRoles === true ) {
                    componentCtx.roles = res.success;
                    componentCtx.loaded++;
                }
            } else if (res.error) {
                componentCtx.rolesLoadingError = res.error.message;
                componentCtx.roles = undefined;
                clearErrors();
            }
        }).catch((err) => {
            componentCtx.rolesLoading = false;
            componentCtx.rolesLoadingError = err.message;
            componentCtx.roles = undefined;
            clearErrors();
        });
    }

    onMounted(() => {
        componentCtx.componentLoading = true;
        componentCtx.loaded = 0;
        loadAvailableRoles();
        loadRoles();
    });

    watch(() => componentCtx.loaded, (newVal,oldVal) => {
        if (newVal && newVal !== oldVal && newVal >= 2) {
            componentCtx.tableLines = [];
            // load the user roles
            for ( const r of componentCtx.roles?.roles || [] ) {
                let isSettable = false;
                for ( const ar of componentCtx.accessibleRoles ) {
                    if ( ar.name === r.name ) {
                        isSettable = true;
                        break;
                    }
                }
                componentCtx.tableLines.push({
                    roleName: r.name,
                    roleDesc: t("role." + r.description),
                    isSet: true,
                    isSettable: isSettable
                });
            }
            // Add the possible roles
            for ( const ar of componentCtx.accessibleRoles ) {
                let found = false;
                for ( const r of componentCtx.roles?.roles || [] ) {
                    if ( ar.name === r.name ) {
                        found = true;
                        break;
                    }
                }
                if ( !found ) {
                    componentCtx.tableLines.push({
                        roleName: ar.name,
                        roleDesc: t("role." + ar.description),
                        isSet: false,
                        isSettable: true
                    });
                }
            }
            componentCtx.tableLines.sort((a, b) => a.roleName.localeCompare(b.roleName));
            // reset
            componentCtx.loaded = 0;
            componentCtx.componentLoading = false;
        }
    }, { immediate: true });

    // ============================================
    // Save changes
    // ============================================

    const saveRoleChanges = () => {
        const updateBody: UserUpdateBody = {
            login: props.login,
            considerRoles: true,
            roles: [] as string[],
            considerGroups: false,
            considerACLs: false,
        };

        for ( const line of componentCtx.tableLines ) {
            if ( line.isSet && line.isSettable) {
                updateBody.roles!.push( line.roleName );
            }
        }
        componentCtx.componentLoading = true;
        $apiBackendUsers.userModuleUpdateRightAndRoles(updateBody).then((res) => {
            if ( res.success ) {
                componentCtx.componentLoading = false;
                toast.add({
                    title: t('RolesForm.updateSuccessTitle'),
                    description: t('RolesForm.updateSuccessDesc'),
                    icon: 'i-lucide-arrow-big-up-dash',
                });
            } else if ( res.error ) {
                componentCtx.componentLoading = false;
                componentCtx.rolesUpdateError = t('login.' + res.error.message);
                clearErrors();
            }
        }).catch((err) => {
            componentCtx.componentLoading = false;
            componentCtx.rolesUpdateError = t('common.unknownError');
            clearErrors();
        });
    }

    const clearErrors = () => {
        setTimeout(() => {
            componentCtx.accessibleRolesError = null;
            componentCtx.rolesLoadingError = null;
            componentCtx.rolesUpdateError = null;
        }, 5000);
    }

    // ============================================
    // Table definition
    // ============================================

    const tableDef: TableColumn<RoleLine>[] = [
        { accessorKey: 'roleName',header: t("RolesForm.roleName") },
        { accessorKey: 'roleDesc',header: t("RolesForm.roleDesc") },
        { accessorKey: 'isSet',header: t("RolesForm.isSet") },
        { accessorKey: 'isSettable',header: t("RolesForm.isSettable") },
    ];
    const columnVisibility = ref({
        isSettable: false,
    })
</script>

<template>
    <div class="relative">
        <div class="flex flex-col">
            <UTable 
                :loading="componentCtx.componentLoading" 
                loading-color="primary" 
                loading-animation="carousel" 
                :data="componentCtx.tableLines" 
                :columns="tableDef"
                :empty="$t('SearchUser.noResults')"
                v-model:column-visibility="columnVisibility"
                sticky
                class="flex-1 text-xs"
            >
                <template #isSet-cell="{ row }">
                    <USwitch v-model="row.original.isSet" :disabled="!row.original.isSettable" color="neutral"/>
                </template>
            </UTable>
            <UButton 
                v-if="!componentCtx.componentLoading"
                :label="$t('RolesForm.applyRoleChange')"
                class="mt-4 self-end h-10" 
                color="neutral" 
                variant="outline" 
                size="md"
                @click="saveRoleChanges()"
            />
        </div>

        <div v-if="componentCtx.componentLoading"
             class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            <UProgress color="neutral" />
        </div>
        <div v-if="componentCtx.accessibleRolesError !== null || componentCtx.rolesLoadingError !== null || componentCtx.rolesUpdateError !== null"
             class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            {{ componentCtx.accessibleRolesError }}
            {{ componentCtx.rolesLoadingError }}
            {{ componentCtx.rolesUpdateError }}
        </div>
    </div>


</template>
