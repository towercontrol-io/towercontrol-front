<script setup lang="ts">
    import type { TableColumn } from '@nuxt/ui'
    import { TwoFATypes, type ActionResult, type UserListElementResponse, type UserSearchBody } from '~/types';

    const { t, locale } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    const nuxtApp = useNuxtApp();
    const UTooltip = resolveComponent('UTooltip')
    const UButton = resolveComponent('UButton')
    const USwitch = resolveComponent('USwitch')

    type UserLine = {
        email: string;
        login: string;
        lastLogin: number | null;
        registrationDate: number | null;
        active: boolean;
        locked: boolean;
        isPasswordExpired: boolean;
        isTwoFaEnabled: boolean;
        deleted: boolean;
    }

    const pageCtx = reactive({
        searchList : [] as UserListElementResponse[],
        searchLoading : false,
        searchError : null as string | null,
        tableLines: [] as UserLine[],

        searchInput: null as string | null,
        lastSearch: null as string | null,
        confirmationLayer: false as boolean,
        pendingAction: 'None' as 'None' | 'Ban' | 'Delete',
        loginOnAction: null as string | null
    });

    const loc :string = locale.value ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

    /** 
     * Event management - refresh the User list when another component modify the users
     */
    nuxtApp.hook("usermng:refresh" as any, async () => {
        loadLastRegisteredList();
    });

    

    /**
     * Load the last registered list from the API
     */
    const loadLastRegisteredList = () => {
        pageCtx.searchLoading = true;
        pageCtx.tableLines = [];

        $apiBackendUsers.userModuleSearchLastRegistered().then((res) => {
            pageCtx.searchLoading = false;
            if (res.success) {
                pageCtx.searchList = res.success;
                pageCtx.tableLines = pageCtx.searchList.map( (line : any) => {
                    // Here some magic, the entry isActive is transformed into 'active'...
                    return {
                        email: line.email,
                        login: line.login,
                        lastLogin: line.lastLogin,
                        registrationDate: line.registrationDate,
                        active: line.active,
                        locked: line.locked,
                        isPasswordExpired: line.passwordExpired,
                        isTwoFaEnabled: (line.twoFa != TwoFATypes.NONE),
                        deleted: (line.deletionDate > 0),
                    } as UserLine;
                });

            } else if (res.error) {
                pageCtx.searchError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.searchError = t('common.unknownError');
        });
    }
    
    onMounted(() => {
        loadLastRegisteredList();    
    });

    /**
     * Call the API to delete a user and move it to purgatory
     * @param values
     */
    const onDelete = (values: any) => {
        pageCtx.confirmationLayer = true;
        pageCtx.pendingAction = 'Delete';
        pageCtx.loginOnAction = values.login;
        pageCtx.searchError = null;
    }
    const onBan = (values: any) => {
        pageCtx.confirmationLayer = true;
        pageCtx.pendingAction = 'Ban';
        pageCtx.loginOnAction = values.login;
        pageCtx.searchError = null;
    }

    const onActionConfirmed = () => {
        pageCtx.confirmationLayer = false;
        pageCtx.searchError = null;
        if ( !pageCtx.loginOnAction ) return;
        
        if ( pageCtx.pendingAction === 'Ban' ) {
            pageCtx.searchError = t('common.notYetImplemented');
        } else if ( pageCtx.pendingAction === 'Delete' ) {
            $apiBackendUsers.userModuleAdminDelete(pageCtx.loginOnAction).then((res) => {
                if (res.success) {
                    nuxtApp.callHook("usermng:refresh" as any);
                } else if (res.error) {
                    pageCtx.searchError = t('login.'+res.error.message);
                }
            }).catch((err) => {
                pageCtx.searchError = t('common.unknownError');
            });
        }
        pageCtx.loginOnAction = null;
        pageCtx.pendingAction = 'None';
    };

    const onActionCancel = () => {
        pageCtx.confirmationLayer = false;
        pageCtx.pendingAction = 'None';
        pageCtx.loginOnAction = null;
    };

    
    /**
     * Change the active status of a user
     */

    const onActiveChange = (values : any, newStatus: boolean) => {
        pageCtx.searchError = null;
        $apiBackendUsers.userModuleSwitchActiveState(values.login, newStatus).then((res) => {
            if (res.success) {
                nuxtApp.callHook("usermng:refresh" as any);
            } else if (res.error) {
                pageCtx.searchError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.searchError = t('common.unknownError');
        });
    }
   

    /**
     * Table definition
     */
    const tableDef: TableColumn<UserLine>[] = [

        { accessorKey: 'registrationDate', header: t("RecentReg.registrationDate"),
          cell: ({ row }) => {
            return new Date(row.getValue('registrationDate') as number).toLocaleString(loc, {
                    year: '2-digit',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false
            });
          }
        },
        { accessorKey: 'login',header: t("RecentReg.login"),
          cell: ({ row }) => {
            const toolText : string =`${row.getValue('email')} (${row.getValue('login')})`;
            let cellText : string = (row.getValue('login') as string).substring(0, 15) + '...';
            let email = row.getValue('email') as string;
            if ( email && email.trim() !== '' && email !== 'encrypted' ) {
                cellText = (row.getValue('email') as string).substring(0, 15) + '...';
            }
            return h(UTooltip, { text: toolText , arrow: true, delayDuration: 100 }, 
                               () => h('span',cellText)
                   );
          }
        },
        { accessorKey: 'email',header: t("RecentReg.email"), enableHiding : true,
          cell: ({ row }) => {
            let email = row.getValue('email') as string;
            if ( !email || email.trim() === '' ) {
                email = t("RecentReg.unknown");
            } else if ( email ==='encrypted' ) {
                email = t("RecentReg.protected");
            }
            const toolText : string =`${email}`;
            const cellText : string = (( row.getValue('email') ? 
                                (email as string).substring(0, 15) + (email.length > 15 ? '...' : '')
                                : t(("RecentReg.unknown")) ));
            return h(UTooltip, { text: toolText , arrow: true, delayDuration: 100 }, 
                               () => h('span',cellText)
                   );
          }
        },
        { accessorKey: 'active', header: t("RecentReg.active"),
          cell: ({ row }) => {
            return h(USwitch, 
                 { 
                    modelValue: row.getValue('active') as boolean, 
                    class: 'capitalize', size: 'xs', variant: 'soft', color: 'primary',
                    'onUpdate:modelValue': (val: boolean) => {
                        row.original.active = val
                        onActiveChange(row.original, val);
                    } 
                 }, () => { return ''; }
            )
          }       
        },
        { accessorKey: 'ban', header: t("RecentReg.ban"), 
          cell: ({ row }) => {
            return h(UButton, { class: 'capitalize', size: 'xs', variant: 'soft', color: 'error', onClick: () => onBan(row.original)}, () =>
                t('RecentReg.ban')
            )
          }        
        },
        { accessorKey: 'delete', header: t("RecentReg.delete"), 
          cell: ({ row }) => {
            return h(UButton, { class: 'capitalize', size: 'xs', variant: 'soft', color: 'error', disabled : row.getValue('deleted'), onClick: () => onDelete(row.original)}, () =>
                t('RecentReg.delete')
            );
          }
        },
        { accessorKey: 'deleted', header: "NA", enableHiding: true,
          cell: ({ row }) => {
            return ('NA')
          }        
        }

    ];

    const columnVisibility = ref({
        deleted: false,
        email: false
    });
</script>

<template>

    <div class="relative">
    <UTable 
       :loading="pageCtx.searchLoading" 
       loading-color="primary" 
       loading-animation="carousel" 
       :data="pageCtx.tableLines" 
       :columns="tableDef"
       :empty="$t('RecentReg.noResults')"
       v-model:column-visibility="columnVisibility"
       sticky
       class="flex-1 text-xs h-55"
    />

    <UPageCard v-if="pageCtx.searchError"
      :title="$t('RecentReg.errorTitle')"
      :description="pageCtx.searchError"
      variant="subtle"
      highlight
      highlight-color="error"
    />

    <!-- Overlay to cover block -->
      <div v-if="pageCtx.confirmationLayer"
        class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
      >
        <div class="flex flex-col items-center gap-4">
            <div class="mb-2 text-sm text-center">
                {{ t('RecentReg.actionConfirmDesc') }}
            </div>
            <div class="flex gap-4">
                <UButton icon="i-lucide-trash-2" variant="soft" color="error" @click="onActionConfirmed()">
                    {{ t('RecentReg.actionConfirm') }}
                </UButton>
                <UButton icon="i-lucide-circle-x" variant="soft" color="primary" @click="onActionCancel()">
                    {{ t('RecentReg.actionCancel') }}
                </UButton>
            </div>
        </div>
      </div>
  </div>

  </template>
