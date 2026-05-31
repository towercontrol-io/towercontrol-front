<script setup lang="ts">
    import { computed, watchEffect, ref, onMounted } from 'vue';
    import type { MandatoryField, GroupsHierarchySimplified } from '~/types';
    import { applicationStore } from '~/stores/app';

    type ParsedFieldType = {
        kind: 'string' | 'number' | 'decimal' | 'boolean' | 'date' | 'enum' | 'groupid';
        pattern?: string;
        min?: number;
        max?: number;
        options?: string[];
        multiple?: boolean;
    };

    const props = defineProps<{
        field: MandatoryField;
        modelValue: string;
    }>();

    const emit = defineEmits<{
        (e: 'update:modelValue', value: string): void;
        (e: 'update:valid', value: boolean): void;
    }>();

    const { t } = useI18n();
    const { $apiBackendUsers } = useNuxtApp();
    const appStore = applicationStore();

    const groupOptions = ref<{ label: string; value: string }[]>([]);
    const groupsLoading = ref(false);

    const hasGlobalRole = (role: string): boolean => {
        const jwt = appStore.getBackendJWT();
        if (!jwt) return false;
        try {
            const payload = JSON.parse(atob((jwt.split('.')[1]) ?? ''));
            const roles: string[] = payload.roles ?? [];
            return roles.includes(role);
        } catch {
            return false;
        }
    };

    const loadGroups = () => {
        groupsLoading.value = true;
        $apiBackendUsers.userModuleGetGroupsHierarchy().then((res) => {
            groupsLoading.value = false;
            if (res.success) {
                const options: { label: string; value: string }[] = [
                    { label: t('capture.groupidNoGroup'), value: '__none__' },
                ];
                const globalAdmin = hasGlobalRole('ROLE_DEVICE_ADMIN');
                const flatten = (groups: GroupsHierarchySimplified[], level: number, parentIncluded: boolean) => {
                    for (const g of groups) {
                        const included = parentIncluded || globalAdmin || (g.roles?.includes('ROLE_DEVICE_ADMIN') ?? false);
                        if (included) {
                            const prefix = '\u2014 '.repeat(level);
                            const rawLabel = g.name === 'groups-default-group' ? t('common.groups-default-group') : g.name;
                            options.push({
                                label: level > 0 ? `${prefix}${rawLabel}` : rawLabel,
                                value: g.shortId,
                            });
                        }
                        if (g.children?.length) {
                            flatten(g.children, level + 1, included);
                        }
                    }
                };
                flatten(res.success, 0, false);
                groupOptions.value = options;
                console.log(options);
            }
        }).catch(() => {
            groupsLoading.value = false;
        });
    };

    const parseValueType = (valueType: string): ParsedFieldType => {
        const commaIndex = valueType.indexOf(',');
        const rawType = commaIndex !== -1 ? valueType.slice(0, commaIndex) : valueType;
        const remainder = commaIndex !== -1 ? valueType.slice(commaIndex + 1) : '';
        const rest = remainder.split(',');
        if (rawType.startsWith('enum[')) {
            const optionsRaw = rawType.slice(5, -1);
            const options = optionsRaw ? optionsRaw.split('|').map((opt) => opt.trim()).filter(Boolean) : [];
            const multiple = rest.includes('multiple');
            return { kind: 'enum', options, multiple };
        }

        if (rawType === 'number') {
            const min = rest[0] ? Number(rest[0]) : undefined;
            const max = rest[1] ? Number(rest[1]) : undefined;
            return { kind: 'number', min, max };
        }

        if (rawType === 'decimal') {
            const min = rest[0] ? Number(rest[0]) : undefined;
            const max = rest[1] ? Number(rest[1]) : undefined;
            return { kind: 'decimal', min, max };
        }

        if (rawType === 'boolean') {
            // force default false when not touched
            emit('update:modelValue', 'false');
            return { kind: 'boolean' };
        }

        if (rawType === 'date') {
            return { kind: 'date' };
        }

        if (rawType === 'groupid') {
            return { kind: 'groupid' };
        }

        if (rawType === 'string' && remainder) {
            return { kind: 'string', pattern: remainder };
        }

        return { kind: 'string' };
    };

    const parsed = computed(() => parseValueType(props.field.valueType));

    const descriptionText = computed(() => {
        const key = `capture.${props.field.description}`;
        const translated = t(key);
        if (translated !== key) {
            return translated;
        }
        return props.field.enDescription || props.field.description;
    });

    const inputValue = computed({
        get: () => {
            if (parsed.value.kind === 'boolean') {
                return props.modelValue === 'true';
            }
            if (parsed.value.kind === 'enum' && parsed.value.multiple) {
                return props.modelValue ? props.modelValue.split(/[|]/).filter(Boolean) : [];
            }
            if (parsed.value.kind === 'groupid') {
                return props.modelValue || '__none__';
            }
            return props.modelValue || '';
        },
        set: (value) => {
            if (parsed.value.kind === 'boolean') {
                emit('update:modelValue', value ? 'true' : 'false');
                return;
            }
            if (parsed.value.kind === 'enum' && parsed.value.multiple) {
                const nextValue = Array.isArray(value) ? value.join('|') : '';
                emit('update:modelValue', nextValue);
                return;
            }
            if (parsed.value.kind === 'groupid') {
                emit('update:modelValue', value === '__none__' ? '__none__' : String(value));
                return;
            }
            emit('update:modelValue', value ? String(value) : '');
        },
    });

    const inputType = computed(() => {
        if (parsed.value.kind === 'date') {
            return 'date';
        }
        if (parsed.value.kind === 'number' || parsed.value.kind === 'decimal') {
            return 'number';
        }
        return 'text';
    });

    const inputStep = computed(() => {
        if (parsed.value.kind === 'decimal') {
            return 'any';
        }
        if (parsed.value.kind === 'number') {
            return '1';
        }
        return undefined;
    });

    onMounted(() => {
        if (parsed.value.kind === 'groupid') {
            loadGroups();
        }
    });

    const errorMessage = computed(() => {
        const rawValue = props.modelValue ?? '';
        const trimmed = rawValue.toString().trim();

        if (parsed.value.kind === 'groupid') {
            return null;
        }

        if (parsed.value.kind !== 'boolean' && trimmed.length === 0) {
            return t('capture.mandatoryFieldRequired');
        }

        if (parsed.value.kind === 'string' && parsed.value.pattern) {
            try {
                const matcher = new RegExp(parsed.value.pattern);
                if (!matcher.test(trimmed)) {
                    return t('capture.mandatoryFieldInvalid');
                }
            } catch {
                return null;
            }
        }

        if (parsed.value.kind === 'number') {
            const parsedValue = Number(trimmed);
            if (!Number.isInteger(parsedValue)) {
                return t('capture.mandatoryFieldInvalid');
            }
            if (parsed.value.min !== undefined && parsedValue < parsed.value.min) {
                return t('capture.mandatoryFieldInvalid');
            }
            if (parsed.value.max !== undefined && parsedValue > parsed.value.max) {
                return t('capture.mandatoryFieldInvalid');
            }
        }

        if (parsed.value.kind === 'decimal') {
            const parsedValue = Number(trimmed);
            if (Number.isNaN(parsedValue)) {
                return t('capture.mandatoryFieldInvalid');
            }
            if (parsed.value.min !== undefined && parsedValue < parsed.value.min) {
                return t('capture.mandatoryFieldInvalid');
            }
            if (parsed.value.max !== undefined && parsedValue > parsed.value.max) {
                return t('capture.mandatoryFieldInvalid');
            }
        }

        if (parsed.value.kind === 'date') {
            const parsedValue = Date.parse(trimmed);
            if (Number.isNaN(parsedValue)) {
                return t('capture.mandatoryFieldInvalid');
            }
        }

        if (parsed.value.kind === 'enum') {
            const options = parsed.value.options ?? [];
            const values = parsed.value.multiple ? trimmed.split(/[|,]/).filter(Boolean) : [trimmed];
            if (values.some((value) => !options.includes(value))) {
                return t('capture.mandatoryFieldInvalid');
            }
        }

        return null;
    });

    watchEffect(() => {
        emit('update:valid', errorMessage.value === null);
    });
</script>

<template>
    <UFormField
        :name="field.name"
        :label="t(`capture.${field.name}`)"
        :description="descriptionText"
        :error="errorMessage"
        required
        class="flex max-sm:flex-col justify-between items-start gap-4 mb-2"
    >
        <template v-if="parsed.kind === 'boolean'">
            <UCheckbox v-model="inputValue" color="neutral" class="w-70" />
        </template>
        <template v-else-if="parsed.kind === 'enum'">
            <USelectMenu
                v-model="inputValue"
                :items="parsed.options || []"
                :multiple="parsed.multiple"
                :searchable="true"
                class="w-70"
            />
        </template>
        <template v-else-if="parsed.kind === 'groupid'">
            <USelectMenu
                v-model="inputValue"
                :items="groupOptions || []"
                value-key="value"
                label-key="label"
                :loading="groupsLoading"
                :searchable="true"
                class="w-70"
            />
        </template>
        <template v-else>
            <UInput
                v-model="inputValue"
                :type="inputType"
                :step="inputStep"
                class="w-70"
            />
        </template>
    </UFormField>
</template>
