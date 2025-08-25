<script setup lang="ts">
    import type { TableColumn } from '@nuxt/ui'
    import type { ActionResult, UserListElementResponse } from '~/types';

    const { t } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    const UBadge = resolveComponent('UBadge')
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
    });

    const onRestore = (values: any) => {
        console.log("restore");
        console.log(values);
    }

    const onPurge = (values: any) => {
        console.log("purge");
        console.log(values);
    }


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
    email: false // cachée au départ
    })

    onMounted(() => {
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
                pageCtx.purgatoryError = t('useradm.general') + ' : ' + res.error.message;
            }
        }).catch((err) => {
            pageCtx.purgatoryError = t('common.unknownError');
        });
        
    })


</script>

<template>

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

</template>