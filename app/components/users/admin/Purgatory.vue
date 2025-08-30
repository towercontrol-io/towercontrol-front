<script setup lang="ts">
    import type { TableColumn } from '@nuxt/ui'
    import type { ActionResult, UserListElementResponse, UserRestoreBody } from '~/types';

    const { t } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    const nuxtApp = useNuxtApp();
    const UTooltip = resolveComponent('UTooltip')
    const UButton = resolveComponent('UButton')

    type PurgatoryLine = {
        email: string;
        login: string;
        dayLeft: number;
        resume: any;
    }

    const pageCtx = reactive({
        purgatoryList : [] as UserListElementResponse[],
        purgatoryLoading : false,
        purgatoryError : null as string | null,
        tableLines: [] as PurgatoryLine[],
        purgeConfirmLayer: false as boolean,
        loginToPurge: null as string | null,
    });

    /** 
     * Event management - refresh the User list when another component modify the users
     */
    nuxtApp.hook('usermng:refresh', async () => {
        console.log('User management refresh hook received on Purgatory');
        loadPurgatoryList();
    });


    /**
     * Call the API to restore a user from the purgatory
     * @param values 
     */
    const onRestore = (values: any) => {

        pageCtx.purgatoryError = null;
        $apiBackendUsers.userModulePurgatoryRestore(values.login).then((res) => {
            if (res.success) {
                nuxtApp.callHook('usermng:refresh', true);
            } else if (res.error) {
                pageCtx.purgatoryError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.purgatoryError = t('common.unknownError');
        });

    }

    /**
     * Call the API to purge a user from the purgatory
     * @param values 
     */
    const onPurge = (values: any) => {
        pageCtx.purgeConfirmLayer = true;
        pageCtx.loginToPurge = values.login;
    }

    const onConfirmPurge = () => {
        pageCtx.purgeConfirmLayer = false;
        pageCtx.purgatoryError = null;
        if ( !pageCtx.loginToPurge ) return;
        
        $apiBackendUsers.userModulePurgatoryPurge(pageCtx.loginToPurge).then((res) => {
            if (res.success) {
                nuxtApp.callHook('usermng:refresh', true);
            } else if (res.error) {
                pageCtx.purgatoryError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.purgatoryError = t('common.unknownError');
        });
        pageCtx.loginToPurge = null;
    }

    const onCancelPurge = () => {
        pageCtx.purgeConfirmLayer = false;
        pageCtx.loginToPurge = null;
    }

    /**
     * Table definition
     */
    const tableDef: TableColumn<PurgatoryLine>[] = [
        { accessorKey: 'login',header: t("Purgatory.login"),
          cell: ({ row }) => {
            const toolText : string =`${row.getValue('login')} (${row.getValue('email')})`;
            const cellText : string = (( row.getValue('login') ? 
                                (row.getValue('login') as string).substring(0, 10) + '...'
                                : t(("Purgatory.unknown")) ));
            return h(UTooltip, { text: toolText , arrow: true, delayDuration: 100 }, 
                               () => h('span',cellText)
                   );
          }
        },
        { accessorKey: 'dayLeft', header: t("Purgatory.dayLeft"),
          cell: ({ row }) => {
            return (row.getValue('dayLeft')) + ' '+ t("Purgatory.days");
         }
        },
        { accessorKey: 'restore', header: t("Purgatory.restore"),
          cell: ({ row }) => {
            return h(UButton, { class: 'capitalize', size: 'xs', variant: 'soft', color: 'info', onClick: () => onRestore(row.original)}, () =>
                t('Purgatory.restore')
            )
          }        
        },
        { accessorKey: 'purge', header: t("Purgatory.purge"),
          cell: ({ row }) => {
            return h(UButton, { class: 'capitalize', size: 'xs', variant: 'soft', color: 'error', onClick: () => onPurge(row.original)}, () =>
                t('Purgatory.purge')
            )
          }        
        },
        { accessorKey: 'email', header: t("Purgatory.email"), enableHiding: true,
          cell: ({ row }) => {
            return ('Purgatory.email')
          }        
        }
    ];

    const columnVisibility = ref({
       email: false // hide this tehcnical column
    })

    /**
     * Load the purgatory list from the API
     */
    const loadPurgatoryList = () => {
        pageCtx.purgatoryLoading = true;
        
        $apiBackendUsers.userModulePurgatoryList().then((res) => {
            pageCtx.purgatoryLoading = false;
            if (res.success) {
                pageCtx.purgatoryList = res.success;
                pageCtx.tableLines = pageCtx.purgatoryList.map( (line) => {
                    return {
                        email: line.email,
                        login: line.login,
                        dayLeft: Math.floor((line.deletionDate - Date.now()) / (1000 * 60 * 60 * 24)),
                        resume: null,
                    } as PurgatoryLine;
                });

            } else if (res.error) {
                pageCtx.purgatoryError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.purgatoryError = t('common.unknownError');
        });
    }

    onMounted(() => {
        loadPurgatoryList();
    })


</script>

<template>

    <div class="relative">

    <UTable 
       :loading="pageCtx.purgatoryLoading" 
       loading-color="primary" 
       loading-animation="carousel" 
       :data="pageCtx.tableLines" 
       :columns="tableDef"
       :empty="$t('Purgatory.noResults')"
       v-model:column-visibility="columnVisibility"
       class="flex-1 text-xs"
    />

    <UPageCard v-if="pageCtx.purgatoryError"
      :title="$t('Purgatory.errorTitle')"
      :description="pageCtx.purgatoryError"
      variant="subtle"
      highlight
      highlight-color="error"
    />

<!-- Overlay qui couvre uniquement ce bloc -->
      <div v-if="pageCtx.purgeConfirmLayer"
        class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-4">
            <div class="mb-2 text-sm text-center">
                 {{ t('Purgatory.purgeConfirmDesc') }}
            </div>
            <div class="flex gap-4">
                <UButton icon="i-lucide-trash-2" variant="soft" color="error" @click="onConfirmPurge()">
                    {{ t('Purgatory.purgeConfirm') }}
                </UButton>
                <UButton icon="i-lucide-circle-x" variant="soft" color="primary" @click="onCancelPurge()">
                    {{ t('Purgatory.purgeCancel') }}
                </UButton>
            </div>
        </div>
      </div>
  </div>

  </template>
