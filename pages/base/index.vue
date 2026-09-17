<template>
  <div class="page">
    <div class="toolbar">
      <NuxtLink to="/" class="btn btn--ghost">← Voltar</NuxtLink>
    </div>
    <h1>Base <em>Ministerial</em></h1>
    <p>Escolha uma opção.</p>

    <NuxtLink to="/base/relatorio" class="card card--clickable hub-card" style="display:block;">
      <strong>Relatório</strong>
      <div class="muted">Registrar os números do seu ministério na celebração.</div>
    </NuxtLink>

    <NuxtLink to="/casa-pastoral" class="card card--clickable hub-card" style="display:block;">
      <strong>Casa Pastoral</strong>
      <div class="muted">Ficha de atendimento pastoral.</div>
    </NuxtLink>

    <NuxtLink to="/organograma" class="card card--clickable hub-card" style="display:block;">
      <strong>Organograma</strong>
      <div class="muted">Visão geral dos ministérios da igreja.</div>
    </NuxtLink>

    <NuxtLink to="/admin" class="card card--clickable hub-card" style="display:block;">
      <strong>Administrador</strong>
      <div class="muted">Área restrita (login obrigatório).</div>
    </NuxtLink>
  </div>
</template>
