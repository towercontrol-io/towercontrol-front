<script setup lang="ts">
   import type { TableColumn } from '@nuxt/ui'
   import { type ActionResult, type UserAccessibleRolesResponse, type UserUpdateBodyResponse, type UserUpdateBody } from '~/types';

   const { t } = useI18n();
   const nuxtApp = useNuxtApp();
   const toast = useToast();
   const { $apiBackendUsers } = useNuxtApp();


   const props = defineProps({ 
      login: { type: String, required: true, default: '' },
      userRoles: { type: Array as PropType<string[]>, required: true, default: () => [] }
   });

    type RoleLine = {
        roleName: string;
        roleDesc: string;
        isSet: boolean;
        isSettable: boolean;
    };


   const componentCtx = reactive({
        componentLoading : false,
        rolesLoadingError : null as string | null,
        rolesLoading : false,
        roles : undefined as UserUpdateBodyResponse | undefined,
        tableLines: [] as RoleLine[],
        loaded : 0 as number,
        rolesUpdateError : null as string | null,
    });

    const loadRoles = () => {
        componentCtx.componentLoading = true;
        componentCtx.rolesLoading = true;
        componentCtx.rolesLoadingError = null;
        $apiBackendUsers.userModuleGetRightAndRoles(props.login,true,false,false,false).then((res) => {
            componentCtx.rolesLoading = false;
            componentCtx.componentLoading = false;
            if (res.success) {
                if ( res.success.considerRoles === true ) {
                    componentCtx.roles = res.success;
                    for ( const r of componentCtx.roles?.roles || [] ) {
                        if ( r.assignable === false ) {
                            // Not assignable role, skip
                            continue;
                        }
                        componentCtx.tableLines.push({
                            roleName: r.name,
                            roleDesc: t("role." + r.description),
                            isSet: false,
                            isSettable: true,
                        });
                    }
                    componentCtx.tableLines.sort((a, b) => a.roleName.localeCompare(b.roleName));
                }
            } else if (res.error) {
                componentCtx.rolesLoadingError = res.error.message;
                componentCtx.roles = undefined;
                clearErrors();
            }
        }).catch((err) => {
            componentCtx.rolesLoading = false;
             componentCtx.componentLoading = false;
            componentCtx.rolesLoadingError = err.message;
            componentCtx.roles = undefined;
            clearErrors();
        });
    }

    onMounted(() => {
        loadRoles();
    });

    const clearErrors = () => {
        setTimeout(() => {
            componentCtx.rolesLoadingError = null;
            componentCtx.rolesUpdateError = null;
        }, 5000);
    }

    const onSwitchChange = () => {
        // Update the role list based on the tableLines
        console.log("Switch changed");
        
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
                    <USwitch v-model="row.original.isSet" :disabled="!row.original.isSettable" color="neutral" @change="onSwitchChange()"/>
                </template>
            </UTable>
        </div>

        <div v-if="componentCtx.componentLoading"
             class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            <UProgress color="neutral" />
        </div>
        <div v-if="componentCtx.rolesLoadingError !== null || componentCtx.rolesUpdateError !== null"
             class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            {{ componentCtx.rolesLoadingError }}
            {{ componentCtx.rolesUpdateError }}
        </div>
    </div>
</template>
