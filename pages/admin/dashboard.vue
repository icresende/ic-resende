<template>
  <div class="page page--wide">
    <div class="toolbar">
      <NuxtLink to="/admin" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Dashboard</h1>
    <p class="muted">Compare os números registrados semana a semana.</p>

    <div class="card">
      <div class="grid-2">
        <div class="field">
          <label>Ministério</label>
          <select v-model="selectedMinistryId" @change="onMinistryChange">
            <option value="">Selecione...</option>
            <option v-for="m in ministries" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
        </div>
        <div class="field">
          <label>Campo</label>
          <select v-model="selectedField" :disabled="!fieldOptions.length">
            <option value="">Selecione...</option>
            <option v-for="f in fieldOptions" :key="f.key" :value="f.key">{{ f.label }}</option>
          </select>
        </div>
      </div>
      <div class="field">
        <label>Filtrar por celebração (opcional)</label>
        <select v-model="selectedLabel">
          <option value="">Todas</option>
          <option v-for="l in labelOptions" :key="l" :value="l">{{ l }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="muted">Carregando...</div>
    <div v-else-if="!selectedMinistryId || !selectedField" class="empty">
      Escolha um ministério e um campo para ver o gráfico.
    </div>
    <div v-else-if="!chartPoints.length" class="empty">Sem registros para esse filtro ainda.</div>

    <div v-else class="card">
      <h2>{{ currentMinistryName }} — {{ currentFieldLabel }}</h2>
      <svg :viewBox="`0 0 ${chartWidth} ${chartHeight}`" style="width:100%;height:auto;">
        <line
          v-for="(g, i) in gridLines" :key="'g'+i"
          :x1="padding" :x2="chartWidth - 10" :y1="g.y" :y2="g.y"
          stroke="#e7e1d8" stroke-width="1"
        />
        <text v-for="(g, i) in gridLines" :key="'t'+i" :x="4" :y="g.y + 4" font-size="11" fill="#6b5f57">{{ g.value }}</text>

        <polyline :points="linePoints" fill="none" stroke="#d96a2b" stroke-width="3" />
        <g v-for="(p, i) in chartPoints" :key="i">
          <circle :cx="p.x" :cy="p.y" r="4" fill="#b84d1b" />
          <text :x="p.x" :y="chartHeight - 6" font-size="10" fill="#6b5f57" text-anchor="middle">{{ p.shortDate }}</text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: "admin" });
const { call } = useApi();
const supabase = useSupabaseClient();

const ministries = ref<any[]>([]);
const history = ref<any[]>([]);
const loading = ref(false);
const selectedMinistryId = ref("");
const selectedField = ref("");
const selectedLabel = ref("");

const fieldOptions = computed(() => {
  const m = ministries.value.find((x) => x.id === selectedMinistryId.value);
  return m?.fields || [];
});

const currentMinistryName = computed(
  () => ministries.value.find((x) => x.id === selectedMinistryId.value)?.name || ""
);
const currentFieldLabel = computed(
  () => fieldOptions.value.find((f: any) => f.key === selectedField.value)?.label || ""
);

const labelOptions = computed(() => {
  const labels = new Set(history.value.map((h) => h.celebrations?.label).filter(Boolean));
  return Array.from(labels);
});

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || "";
}

async function onMinistryChange() {
  selectedField.value = "";
  selectedLabel.value = "";
  history.value = [];
  if (!selectedMinistryId.value) return;
  loading.value = true;
  const token = await getToken();
  history.value = await call(`/ministries/${selectedMinistryId.value}/history`, { token });
  loading.value = false;
}

const chartWidth = 720;
const chartHeight = 260;
const padding = 34;

const rawSeries = computed(() => {
  if (!selectedField.value) return [];
  return history.value
    .filter((h) => !selectedLabel.value || h.celebrations?.label === selectedLabel.value)
    .map((h) => ({
      date: h.celebrations?.date || h.submitted_at?.slice(0, 10),
      value: Number(h.data?.[selectedField.value]) || 0,
    }))
    .sort((a, b) => (a.date > b.date ? 1 : -1));
});

const chartPoints = computed(() => {
  const series = rawSeries.value;
  if (!series.length) return [];
  const maxVal = Math.max(...series.map((s) => s.value), 1);
  const usableWidth = chartWidth - padding - 20;
  const step = series.length > 1 ? usableWidth / (series.length - 1) : 0;
  return series.map((s, i) => {
    const x = padding + step * i;
    const y = chartHeight - 24 - (s.value / maxVal) * (chartHeight - 50);
    const [y2, m2, d2] = (s.date || "").split("-");
    return { x, y, value: s.value, shortDate: d2 && m2 ? `${d2}/${m2}` : "" };
  });
});

const linePoints = computed(() => chartPoints.value.map((p) => `${p.x},${p.y}`).join(" "));

const gridLines = computed(() => {
  const series = rawSeries.value;
  if (!series.length) return [];
  const maxVal = Math.max(...series.map((s) => s.value), 1);
  const steps = 4;
  const lines = [];
  for (let i = 0; i <= steps; i++) {
    const value = Math.round((maxVal / steps) * (steps - i));
    const y = 20 + ((chartHeight - 50) / steps) * i;
    lines.push({ value, y });
  }
  return lines;
});

onMounted(async () => {
  const token = await getToken();
  ministries.value = await call("/ministries?all=true", { token });
});
</script>
