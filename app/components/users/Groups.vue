<script setup lang="ts">
    import type { ActionResult, UserUpdateBodyResponse } from '~/types';
    import type { CheckboxGroupItem, CheckboxGroupValue } from '@nuxt/ui'

    const { t } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    const nuxtApp = useNuxtApp();
    const appStore = applicationStore();

    const componentCtx = reactive({
        componentLoading : false,
        componentError : null as string | null,

        groups : undefined as UserUpdateBodyResponse | undefined,
    });

    const items = ref<CheckboxGroupItem[]>([]);
    const value = ref<CheckboxGroupValue[]>([]);


    const loadGroups = () => {
        if (appStore.getUserLogin() === null) return;
        componentCtx.componentLoading = true;
        componentCtx.componentError = null;
        $apiBackendUsers.userModuleGetRightAndRoles(appStore.getUserLogin(),false,true,true).then((res) => {
            componentCtx.componentLoading = false;
            if (res.success) {
                componentCtx.groups = res.success;
                items.value = [];
                if ( res.success.considerGroups === true ) {
                    if ( componentCtx.groups.groups !== undefined ) {
                        for (const g of componentCtx.groups.groups) {
                            let name = (g.name === "groups-default-group")? t("groups."+g.name) : g.name;
                            let desc = (g.name === "groups-default-group")? t("groups."+g.description) : g.description;
                            items.value.push({
                                label: name,
                                description: t("groups.owner") + desc,
                                id: g.shortId,
                                disabled: true
                            });
                            value.value.push(g.shortId); // Preselect all groups
                        }
                    }
                }
                if ( res.success.considerACLs === true ) {
                    if ( componentCtx.groups.acls !== undefined ) {
                        for ( const a of componentCtx.groups.acls) {
                            const rights = ( a.roles !== undefined ) ? a.roles.map(r => r).join(", ") : "";
                            items.value.push({
                                label: a.localName,
                                description: t("groups.delegation") + rights,
                                id: a.group,
                                disabled: true
                            });
                            value.value.push(a.group); // Preselect all ACLs
                        }
                    }
                }
            } else if (res.error) {
                componentCtx.componentError = res.error.message;
                componentCtx.groups = undefined;
            }
        }).catch((err) => {
            componentCtx.componentLoading = false;
            componentCtx.componentError = err.message;
            componentCtx.groups = undefined;
        });
    }

    onMounted(() => {
        loadGroups();
    });

</script>

<template>
    <div class="relative">

        <div class="flex h-200px">
            <UCheckboxGroup v-model="value" value-key="id" :items="items" />
        </div>

        <div v-if="componentCtx.componentLoading"
             class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            <UProgress color="neutral" />
        </div>

    </div>
</template>