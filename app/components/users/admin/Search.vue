<script setup lang="ts">
    import type { TableColumn } from '@nuxt/ui'
    import { TwoFATypes, type ActionResult, type UserListElementResponse, type UserSearchBody } from '~/types';

    const { t, locale } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    const UBadge = resolveComponent('UBadge')
    const UTooltip = resolveComponent('UTooltip')
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
    }

    const pageCtx = reactive({
        searchList : [] as UserListElementResponse[],
        searchLoading : false,
        searchError : null as string | null,
        tableLines: [] as UserLine[],

        searchInput: null as string | null,
        lastSearch: null as string | null,
    });

    const loc :string = locale.value ?? (typeof navigator !== 'undefined' ? navigator.language : 'en-US');

    /**
     * Manage the user input and decide to call the search API
     * For the email, currenltly only search if more than 3 characters are entered
     * and only the @ character will make an interest to search more as only the
     * 3 char on start and after @ will be used for the search.
     * When the input is just HEXCHAR, it is a user Login and can go to a different search
     * 
     */
    const onSearchChange = (force : boolean = false) => {

        if ( ! pageCtx.searchInput || pageCtx.searchInput.trim().length === 0 ) {
            loadLastConnectedList();
            return;
        }

        // With @ the previous result can be not matching until we have enough char
        if ( pageCtx.lastSearch?.includes('@') !== pageCtx.searchInput.includes('@') ) {
            pageCtx.tableLines = [];
        }

        if ( pageCtx.searchInput && pageCtx.searchInput.length > 2 ) {
            //  enough char to search
            if (   ( !pageCtx.lastSearch && pageCtx.searchInput.length > 2 )
                || ( pageCtx.lastSearch && pageCtx.searchInput.substring(0,3) !== pageCtx.lastSearch?.substring(0,3) )
                || ( pageCtx.searchInput.includes('@') && pageCtx.searchInput.split('@')[1].length === 3)  
                || force
            ) {
                // new search
                pageCtx.lastSearch = pageCtx.searchInput;

                pageCtx.searchLoading = true;
                pageCtx.searchError = null;

                pageCtx.tableLines = [];
                $apiBackendUsers.userModuleSearchByEmail(pageCtx.searchInput).then((res) => {
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
                            } as UserLine;
                        });
                    } else if (res.error) {
                        pageCtx.searchError = t('login.'+res.error.message);
                    }
                }).catch((err) => {
                    pageCtx.searchLoading = false;
                    pageCtx.searchError = t('common.unknownError');
                });
            }
        }
    };


    /**
     * Load the last connected list from the API
     */
    const loadLastConnectedList = () => {
        pageCtx.searchLoading = true;
        pageCtx.tableLines = [];

        $apiBackendUsers.userModuleSearchLastConnected().then((res) => {
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
        loadLastConnectedList();    
    });

    /**
     * Call the API to purge a user from the purgatory
     * @param values 
     *//*
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
                loadPurgatoryList();
            } else if (res.error) {
                pageCtx.purgatoryError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.purgatoryError = t('common.unknownError');
        });
        pageCtx.loginToPurge = null;
    }
*/
    /**
     * Change the active status of a user
     */

    const onActiveChange = (values : any, newStatus: boolean) => {
        pageCtx.searchError = null;
        $apiBackendUsers.userModuleSwitchActiveState(values.login, newStatus).then((res) => {
            if (res.success) {
                onSearchChange();
            } else if (res.error) {
                pageCtx.searchError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.searchError = t('common.unknownError');
        });
    }

    /**
     * Change the lock status of a user
     */

    const onLockChange = (values : any, newStatus: boolean) => {
        pageCtx.searchError = null;
        $apiBackendUsers.userModuleSwitchLockState(values.login, newStatus).then((res) => {
            if (res.success) {
                onSearchChange();
            } else if (res.error) {
                pageCtx.searchError = t('login.'+res.error.message);
            }
        }).catch((err) => {
            pageCtx.searchError = t('common.unknownError');
        });
    }

    /**
     * Disable the second factor authentication status of a user
     */

    const on2FADisable = (values : any, newStatus: boolean) => {
        pageCtx.searchError = null;
        if ( newStatus ) return; // only when disabling
        $apiBackendUsers.userModuleDisable2FaState(values.login).then((res) => {
            if (res.success) {
                onSearchChange();
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
        { accessorKey: 'login',header: t("SearchUser.login"),
          cell: ({ row }) => {
            const toolText : string =`${row.getValue('login')}`;
            const cellText : string = (( row.getValue('login') ? 
                                (row.getValue('login') as string).substring(0, 10) + '...'
                                : t(("SearchUser.unknown")) ));
            return h(UTooltip, { text: toolText , arrow: true, delayDuration: 100 }, 
                               () => h('span',cellText)
                   );
          }
        },
        { accessorKey: 'email',header: t("SearchUser.email"),
          cell: ({ row }) => {
            let email = row.getValue('email') as string;
            if ( !email || email.trim() === '' ) {
                email = t("SearchUser.unknown");
            } else if ( email ==='encrypted' ) {
                email = t("SearchUser.protected");
            }
            const toolText : string =`${email}`;
            const cellText : string = (( row.getValue('email') ? 
                                (email as string).substring(0, 15) + (email.length > 15 ? '...' : '')
                                : t(("SearchUser.unknown")) ));
            return h(UTooltip, { text: toolText , arrow: true, delayDuration: 100 }, 
                               () => h('span',cellText)
                   );
          }
        },
        { accessorKey: 'lastLogin', header: t("SearchUser.lastLogin"),
          cell: ({ row }) => {
            return new Date(row.getValue('lastLogin') as number).toLocaleString(loc, {
                year: '2-digit',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            }
        },
        { accessorKey: 'active', header: t("SearchUser.active"),
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
        { accessorKey: 'locked', header: t("SearchUser.locked"),
          cell: ({ row }) => {
            return h(USwitch, 
                 { 
                    modelValue: row.getValue('locked') as boolean, 
                    class: 'capitalize', size: 'xs', variant: 'soft', color: 'primary',
                    'onUpdate:modelValue': (val: boolean) => {
                        row.original.locked = val
                        onLockChange(row.original, val);
                    } 
                 }, () => { return ''; }
            )
          }        
        },
        { accessorKey: 'isTwoFaEnabled', header: t("SearchUser.2fa"), 
          cell: ({ row }) => {
            return h(USwitch, 
                 { 
                    modelValue: row.getValue('isTwoFaEnabled') as boolean, 
                    class: 'capitalize', size: 'xs', variant: 'soft', color: 'primary',
                    disabled: !(row.getValue('isTwoFaEnabled') as boolean), // can only disable
                    'onUpdate:modelValue': (val: boolean) => {
                        row.original.isTwoFaEnabled = val
                        on2FADisable(row.original, val);
                    } 
                 }, () => { return ''; }
            )
          }        
        }
    ];

    const columnVisibility = ref({
    })

</script>

<template>

    <div class="relative">
    <UInput
      v-model="pageCtx.searchInput"
      :placeholder="t('SearchUser.searchPlaceholder')"
      clearable
      class="mb-4 w-1/4"
      @update:model-value="onSearchChange()"
    />

    <UTable 
       :loading="pageCtx.searchLoading" 
       loading-color="primary" 
       loading-animation="carousel" 
       :data="pageCtx.tableLines" 
       :columns="tableDef"
       :empty="$t('SearchUser.noResults')"
       v-model:column-visibility="columnVisibility"
       class="flex-1 text-xs"
    />

    <UPageCard v-if="pageCtx.searchError"
      :title="$t('SearchUser.errorTitle')"
      :description="pageCtx.searchError"
      variant="subtle"
      highlight
      highlight-color="error"
    />

    <!-- Overlay to cover block -->
      <div v-if="pageCtx.purgeConfirmLayer"
        class="absolute inset-0 z-10 bg-white/5 backdrop-blur-sm flex items-center justify-center"
      >
          <div class="mb-2 text-sm">
            {{ t('Purgatory.purgeConfirmDesc') }}
          </div>
          <UButton icon="i-lucide-trash-2" variant="soft" color="error" @click="">
            {{ t('Purgatory.purgeConfirm') }}
          </UButton>
      </div>
  </div>

  </template>
