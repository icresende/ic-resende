<template>
  <div class="field">
    <label>{{ field.label }} <span v-if="field.required" class="pastoral-required">*</span></label>

    <input v-if="field.type === 'text'" :value="modelValue" @input="onInput(($event.target as HTMLInputElement).value)" type="text" />

    <textarea
      v-else-if="field.type === 'textarea'"
      :value="modelValue"
      @input="onInput(($event.target as HTMLTextAreaElement).value)"
      rows="3"
    />

    <input
      v-else-if="field.type === 'phone'"
      :value="modelValue"
      @input="onPhoneInput(($event.target as HTMLInputElement).value)"
      type="text"
      inputmode="numeric"
      placeholder="(00) 00000-0000"
      maxlength="15"
    />

    <div v-else-if="field.type === 'single_select'" class="pastoral-options">
      <label v-for="opt in field.options" :key="opt" class="pastoral-option">
        <input type="radio" :name="field.key" :checked="modelValue === opt" @change="onInput(opt)" />
        <span>{{ opt }}</span>
      </label>
    </div>

    <div v-else-if="field.type === 'multi_select'" class="pastoral-options">
      <label v-for="opt in field.options" :key="opt" class="pastoral-option">
        <input
          type="checkbox"
          :checked="Array.isArray(modelValue) && modelValue.includes(opt)"
          @change="toggleOption(opt, ($event.target as HTMLInputElement).checked)"
        />
        <span>{{ opt }}</span>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ field: any; modelValue: any }>();
const emit = defineEmits<{ (e: "update:modelValue", value: any): void }>();
const { maskPhone } = usePhoneMask();

function onInput(value: any) {
  emit("update:modelValue", value);
}

function onPhoneInput(value: string) {
  emit("update:modelValue", maskPhone(value));
}

function toggleOption(opt: string, checked: boolean) {
  const arr: string[] = Array.isArray(props.modelValue) ? [...props.modelValue] : [];
  const i = arr.indexOf(opt);
  if (checked && i === -1) arr.push(opt);
  if (!checked && i > -1) arr.splice(i, 1);
  emit("update:modelValue", arr);
}
</script>
