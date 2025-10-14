<script setup lang="ts">
   import type { TableColumn } from '@nuxt/ui'
import GroupId from '~/pages/front/private/groups/show/[groupId].vue';
   import { type ActionResult, type GroupItf, type UserUpdateBodyResponse, type UserAccessibleRolesResponse, type AclItf } from '~/types';

   const { t } = useI18n();
   const nuxtApp = useNuxtApp();
   const { $apiBackendUsers } = useNuxtApp();
   const appStore = applicationStore();


   const props = defineProps({ 
      login: { type: String, required: true, default: '' },
   });

    type GroupLine = {
        groupShortId : string;
        groupName: string;
        groupLocalName: string;
        groupDesc: string;
        groupLevel: number;
        groupPossibleRoles: string[] | null;
        groupSelectedRoles: string[] | null;
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
        accessibleRoles : [] as UserAccessibleRolesResponse[],
        accessibleRolesError : null as string | null,
        accessibleRolesLoading : false,
    });


    /**
     * Get the available roles you can give to that user for the ACL management
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
            }
        }).catch((err) => {
            componentCtx.accessibleRolesLoading = false;
            componentCtx.accessibleRolesError = t('common.unknownError');
        });
    }



    /**
     * Convert a acl hierarchy into a flat list with levels for display in a table
     * Recursive function
     * @param group - the group current progress
     * @param list - the list to populate
     * @param _set - whether the group is set (user is member of)
     * @param _settable - whether the group is settable (admin can add/remove user to/from)
     * @param level - the level of the group in the hierarchy
     */
    const flattenAclHierarchy = (group: AclItf, list: GroupLine[], _set: boolean, _settable: boolean, level: number, asAdmin: boolean) => {
        if ( group.acl.group.startsWith("user_") ) {
            console.log("Skip user group");
            // @TODO
            return;
        }
        let line = {
            groupShortId: group.acl.group as string,
            groupName: group.acl.localName as string,
            groupLocalName: group.acl.localName as string,
            groupDesc: '' as string,
            isSet: _set,
            isSettable: _settable,
            groupLevel: level,
            groupPossibleRoles: (asAdmin)?group.acl.roles:[],
            groupSelectedRoles: (!asAdmin)?group.acl.roles:[],
        };
        list.push(line);
        if ( group.subs !== undefined ) {
            for ( const sg of group.subs ) {
                flattenAclHierarchy(sg, list,_set,_settable, level+1, asAdmin);
            }
        }
    }


    /**
     * Convert a group hierarchy into a flat group list with levels for display in a table
     * Recursive function
     * @param group - the group current progress
     * @param list - the list to populate
     * @param _set - whether the group is set (user is member of)
     * @param _settable - whether the group is settable (admin can add/remove user to/from)
     * @param level - the level of the group in the hierarchy
     */
    const flattenGroupHierarchy = (group: GroupItf, list: GroupLine[], _set: boolean, _settable: boolean, level: number) => {
        if ( group.shortId.startsWith("user_") ) {
            console.log("Skip user group");
            // @TODO
            return;
        }

        let line = {
            groupShortId: group.shortId as string,
            groupName: group.name as string,
            groupLocalName: group.name as string,
            groupDesc: group.description as string,
            isSet: _set,
            isSettable: _settable,
            groupLevel: level,
            groupPossibleRoles: null, // completer later after roles are loaded
            groupSelectedRoles: null,
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
        $apiBackendUsers.userModuleGetRightAndRoles(appStore.userLogin as string,false,true,true,true).then((res) => {
            componentCtx.accessibleGroupsLoading = false;
            componentCtx.accessibleGroups = [];
            if (res.success) {
                if ( res.success.considerGroups === true && res.success.groups !== undefined ) {
                    // We get a list of group hierarchy, we need to flatten it with a sub representation
                    for ( const g of res.success.groups.sort((a, b) => a.name.localeCompare(b.name)) || [] ) {
                        flattenGroupHierarchy(g, componentCtx.accessibleGroups,false,true,0);
                    }
                } else {
                    componentCtx.groupsLoadingError = t('AclsForm.noGroupAvailable');
                }
                if ( res.success.considerACLs === true && res.success.acls !== undefined ) {
                    for ( const a of res.success.acls.sort((a, b) => a.acl.localName.localeCompare(b.acl.localName)) || [] ) {
                        flattenAclHierarchy(a, componentCtx.accessibleGroups,false,true,0,true);
                    }
                }
                console.log(componentCtx.accessibleGroups);
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
        $apiBackendUsers.userModuleGetRightAndRoles(props.login,false,false,true,true).then((res) => {
            componentCtx.groupsLoading = false;
            componentCtx.groups = [];
            if (res.success) {
                if ( res.success.considerACLs === true && res.success.acls !== undefined ) {
                    // We get a list of group hierarchy, we need to flatten it with a sub representation
                    for ( const g of res.success.acls.sort((a, b) => a.acl.localName.localeCompare(b.acl.localName)) || [] ) {
                        flattenAclHierarchy(g, componentCtx.groups,true,false,0,false);
                    }
                    console.log(componentCtx.groups);
                } else {
                    componentCtx.groupsLoadingError = t('AclsForm.noGroupAvailable');
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
        loadAvailableRoles();
        loadAvailableGroups();
        loadGroups();
    });

    watch(() => componentCtx.loaded, (newVal,oldVal) => {
        if (newVal && newVal !== oldVal && newVal >= 3) {
            componentCtx.tableLines = [];
            // load the user groups
            for ( const r of componentCtx.groups ) {
                for ( const ar of componentCtx.accessibleGroups ) {
                    if ( ar.groupName === r.groupName ) {
                        r.isSettable = true;
                        if ( ar.groupPossibleRoles !== null ) {
                            r.groupPossibleRoles = ar.groupPossibleRoles;
                        } else {
                            r.groupPossibleRoles = componentCtx.accessibleRoles.map(role => role.name);
                        }
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
                    if ( ar.groupPossibleRoles == null ) {
                       ar.groupPossibleRoles = componentCtx.accessibleRoles.map(role => role.name);
                    }
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
        { accessorKey: 'groupName',header: t("AclsForm.groupName") },
        { accessorKey: 'isSet',header: t("AclsForm.isSet") },
        { accessorKey: 'groupPossibleRoles',header: t("AclsForm.possibleRoles") },
        { accessorKey: 'groupLocalName',header: t("AclsForm.groupLocalName") },
    ];
    const columnVisibility = ref({
        isSettable: false,
        groupShortId: false,
        groupDesc: false,
        groupPossibleRoles: true, // a changer
        groupSelectedRoles: false,
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
                <template #groupPossibleRoles-cell="{ row }">
                    <div v-if="row.original.isSet && row.original.groupPossibleRoles !== null">
                        <USelect
                            v-model="row.original.groupSelectedRoles"
                            :options="row.original.groupPossibleRoles.map( role => ({ label: role, value: role }) )"
                            multiple
                            :clearable="false"
                            :searchable="true"
                            size="xs"
                            color="neutral"
                            placeholder="Select roles"
                        />
                    </div>
                    <div v-else class="text-neutral-500 italic">
                        {{ $t('AclsForm.noRoles') }}
                    </div>
                </template>
            </UTable>
            <UButton 
                v-if="!componentCtx.componentLoading"
                :label="$t('AclsForm.applyGroupChange')"
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
