<template>
  <div class="page">
    <h1>Bem-vindo à <em>IC. Resende</em></h1>
    <p>Escolha por onde você quer começar.</p>

    <NuxtLink to="/servico" class="card card--clickable hub-card" style="display:block;">
      <strong>Serviço / Manutenção</strong>
      <div class="muted">Ficha do serviço do dia e controle de estoque.</div>
    </NuxtLink>

    <NuxtLink to="/base" class="card card--clickable hub-card" style="display:block;">
      <strong>Base Ministerial</strong>
      <div class="muted">Relatório de celebração, Casa Pastoral, Organograma e Administrador.</div>
    </NuxtLink>
  </div>
</template>
