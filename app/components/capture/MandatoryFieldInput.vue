<script setup lang="ts">
    import { computed } from 'vue';
    import type { MandatoryField } from '~/types';

    type ParsedFieldType = {
        kind: 'string' | 'number' | 'decimal' | 'boolean' | 'date' | 'enum';
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
    }>();

    const { t } = useI18n();

    const parseValueType = (valueType: string): ParsedFieldType => {
        const [rawType, ...rest] = valueType.split(',');
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
            return { kind: 'boolean' };
        }

        if (rawType === 'date') {
            return { kind: 'date' };
        }

        if (rawType === 'string' && rest[0]) {
            return { kind: 'string', pattern: rest[0] };
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
                return props.modelValue ? props.modelValue.split(/[|,]/).filter(Boolean) : [];
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

    const errorMessage = computed(() => {
        const rawValue = props.modelValue ?? '';
        const trimmed = rawValue.toString().trim();

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
