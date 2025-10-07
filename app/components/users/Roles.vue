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

        roles : undefined as UserUpdateBodyResponse | undefined,
    });

    const items = ref<CheckboxGroupItem[]>([]);
    const value = ref<CheckboxGroupValue[]>([]);


    const loadRoles = () => {
        if (appStore.getUserLogin() === null) return;
        componentCtx.componentLoading = true;
        componentCtx.componentError = null;
        $apiBackendUsers.userModuleGetRightAndRoles(appStore.getUserLogin(),true,false,false).then((res) => {
            componentCtx.componentLoading = false;
            if (res.success) {
                if ( res.success.considerRoles === true ) {
                    componentCtx.roles = res.success;
                    if ( componentCtx.roles.roles !== undefined ) {
                        items.value = [];
                        for (const r of componentCtx.roles.roles) {
                            items.value.push({
                                label: r.name,
                                description: t("role." + r.description),
                                id: r.name,
                                disabled: true
                            });
                            value.value.push(r.name); // Preselect all roles
                        }
                    }
                }
            } else if (res.error) {
                componentCtx.componentError = res.error.message;
                componentCtx.roles = undefined;
            }
        }).catch((err) => {
            componentCtx.componentLoading = false;
            componentCtx.componentError = err.message;
            componentCtx.roles = undefined;
        });
    }

    onMounted(() => {
        loadRoles();
    });

</script>

<template>
    <div class="relative">
        <div class="flex">
            <UCheckboxGroup v-model="value" value-key="id" :items="items" />
        </div>

        <div v-if="componentCtx.componentLoading"
             class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
        >
            <UProgress color="neutral" />
        </div>
    </div>
</template>