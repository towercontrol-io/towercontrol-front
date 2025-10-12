<script setup lang="ts">
   import type { TableColumn } from '@nuxt/ui'
   import { type ActionResult, type GroupItf, type UserUpdateBodyResponse } from '~/types';

   const { t } = useI18n();
   const nuxtApp = useNuxtApp();
   const { $apiBackendUsers } = useNuxtApp();
   const appStore = applicationStore();


   const props = defineProps({ 
      login: { type: String, required: true, default: '' },
   });

    type GroupLine = {
        groupName: string;
        groupDesc: string;
        groupLevel: number;
        isSet: boolean;
        isSettable: boolean;
    };


   const componentCtx = reactive({
        accessibleGroups : [] as GroupLine[],
        componentLoading : false,
        accessibleGroupsError : null as string | null,
        accessibleGroupsLoading : false,
        groupsLoadingError : null as string | null,
        groupsLoading : false,
        groups : [] as GroupLine[],
        tableLines: [] as GroupLine[],
        loaded : 0 as number,
    });

    /**
     * Convert a group hierarchy into a flat list with levels for display in a table
     * Recursive function
     * @param group - the group current progress
     * @param list - the list to populate
     * @param _set - whether the group is set (user is member of)
     * @param _settable - whether the group is settable (admin can add/remove user to/from)
     * @param level - the level of the group in the hierarchy
     */
    const flattenGroupHierarchy = (group: GroupItf, list: GroupLine[], _set: boolean, _settable: boolean, level: number) => {
        // The default group can't be removed. The ownerhip can't be changed
        // It will be possible to delegate rights with the ACLs.
        if ( group.name === "groups-default-group" ) {
            return;
        }
        let line = {
            groupName: group.name as string,
            groupDesc: group.description as string,
            isSet: _set,
            isSettable: _settable,
            groupLevel: level
        };
        list.push(line);
        if ( group.subs !== undefined ) {
            for ( const sg of group.subs ) {
                flattenGroupHierarchy(sg, list,_set,_settable, level+1);
            }
        }
    }


   /*
    * Get the available groups the admin can give to that user
    * We can only add a group we own, the ACL group can only be given with ACL management
    */
    const loadAvailableGroups = () => {
        componentCtx.accessibleGroupsLoading = true;
        $apiBackendUsers.userModuleGetRightAndRoles(appStore.userLogin as string,false,true,true,false).then((res) => {
            componentCtx.accessibleGroupsLoading = false;
            componentCtx.accessibleGroups = [];
            if (res.success) {
                if ( res.success.considerGroups === true && res.success.groups !== undefined ) {
                    // We get a list of group hierarchy, we need to flatten it with a sub representation
                    for ( const g of res.success.groups.sort((a, b) => a.name.localeCompare(b.name)) || [] ) {
                        flattenGroupHierarchy(g, componentCtx.accessibleGroups,false,true,0);
                    }
                    console.log(componentCtx.accessibleGroups);
                } else {
                    componentCtx.groupsLoadingError = t('GroupsForm.noGroupAvailable');
                }
                componentCtx.loaded++;
            } else if (res.error) {
                componentCtx.accessibleGroupsError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            componentCtx.accessibleGroupsLoading = false;
            componentCtx.accessibleGroupsError = t('common.unknownError');
        });
    }

    /**
     * Get the groups the user have access to
     * and flatten the hierarchy for the display
     */
    const loadGroups = () => {
        componentCtx.groupsLoading = true;
        componentCtx.groupsLoadingError = null;
        $apiBackendUsers.userModuleGetRightAndRoles(props.login,false,true,true,false).then((res) => {
            componentCtx.groupsLoading = false;
            componentCtx.groups = [];
            if (res.success) {
                if ( res.success.considerGroups === true && res.success.groups !== undefined ) {
                    // We get a list of group hierarchy, we need to flatten it with a sub representation
                    for ( const g of res.success.groups.sort((a, b) => a.name.localeCompare(b.name)) || [] ) {
                        flattenGroupHierarchy(g, componentCtx.groups,true,false,0);
                    }
                    console.log(componentCtx.groups);
                } else {
                    componentCtx.groupsLoadingError = t('GroupsForm.noGroupAvailable');
                }
                componentCtx.loaded++;
            } else if (res.error) {
                componentCtx.groupsLoadingError = res.error.message;
                componentCtx.groups = [];
            }
        }).catch((err) => {
            componentCtx.groupsLoading = false;
            componentCtx.groupsLoadingError = err.message;
            componentCtx.groups = [];
        });
    }

    onMounted(() => {
        componentCtx.componentLoading = true;
        componentCtx.loaded = 0;
        componentCtx.tableLines = [];
        loadAvailableGroups();
        loadGroups();
    });

    watch(() => componentCtx.loaded, (newVal,oldVal) => {
        if (newVal && newVal !== oldVal && newVal >= 2) {
            componentCtx.tableLines = [];
            // load the user groups
            for ( const r of componentCtx.groups ) {
                for ( const ar of componentCtx.accessibleGroups ) {
                    if ( ar.groupName === r.groupName ) {
                        r.isSettable = true;
                        break;
                    }
                }
                componentCtx.tableLines.push(r);
            }
            // Add the possible groups
            for ( const ar of componentCtx.accessibleGroups ) {
                let found = false;
                for ( const r of componentCtx.groups ) {
                    if ( ar.groupName === r.groupName ) {
                        found = true;
                        break;
                    }
                }
                if ( !found ) {
                    ar.isSet = false;
                    componentCtx.tableLines.push(ar);
                }
            }
            // reset
            componentCtx.loaded = 0;
            componentCtx.componentLoading = false;
        }
    }, { immediate: true });


    // ============================================
    // Table definition
    // ============================================

    const tableDef: TableColumn<GroupLine>[] = [
        { accessorKey: 'groupName',header: t("GroupsForm.groupName") },
        { accessorKey: 'groupDesc',header: t("GroupsForm.groupDesc") },
        { accessorKey: 'isSet',header: t("GroupsForm.isSet") },
        { accessorKey: 'isSettable',header: t("GroupsForm.isSettable") },
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
                <template #groupName-cell="{ row }">
                    <span :style="`margin-left: ${row.original.groupLevel * 0.7}rem`">
                        <UIcon v-if="row.original.groupLevel > 0" v-i name="i-lucide-plus" class="mr-2" />
                        {{ row.original.groupName }}
                    </span>
                </template>
                <template #isSet-cell="{ row }">
                    <USwitch v-model="row.original.isSet" :disabled="!row.original.isSettable" color="neutral"/>
                </template>
            </UTable>
            <UButton 
                v-if="!componentCtx.componentLoading"
                :label="$t('GroupsForm.applyGroupChange')"
                class="mt-4 self-end h-10" 
                color="neutral" 
                variant="outline" 
                size="md"
                @click="() => { /* TODO: Save the roles for that user */ }"
            />
        </div>

        <div v-if="componentCtx.componentLoading"
             class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            <UProgress color="neutral" />
        </div>
        <div v-if="componentCtx.accessibleGroupsError !== null || componentCtx.groupsLoadingError !== null"
             class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            {{ componentCtx.accessibleGroupsError }}
            {{ componentCtx.groupsLoadingError }}
        </div>
    </div>


</template>
