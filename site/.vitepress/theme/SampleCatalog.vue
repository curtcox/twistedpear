<script setup>
import { computed, ref } from "vue";
import { withBase } from "vitepress";

function matchesQuery(haystack, query) {
  const text = haystack.toLowerCase();
  for (const token of query.toLowerCase().trim().split(/\s+/)) {
    if (token !== "" && !text.includes(token)) return false;
  }
  return true;
}

const props = defineProps({
  rows: { type: Array, required: true },
});

const query = ref("");

const visible = computed(() =>
  props.rows.filter((row) => matchesQuery(row.searchText, query.value)),
);

function dashIfEmpty(value) {
  return value === null || value === "" || (Array.isArray(value) && value.length === 0)
    ? null
    : value;
}
</script>

<template>
  <div class="sample-catalog">
    <div class="sample-catalog__search" role="search">
      <label for="sample-catalog-filter">Filter samples</label>
      <input
        id="sample-catalog-filter"
        v-model="query"
        type="search"
        autocomplete="off"
        spellcheck="false"
        placeholder="Name, language, capability, chapter…"
      />
    </div>
    <p class="sample-catalog__count" aria-live="polite">
      Showing {{ visible.length }} of {{ rows.length }} listings.
    </p>
    <div class="sample-catalog__scroll">
      <table>
        <caption class="visually-hidden">
          Documented code samples with source, documentation, live, and editor links
        </caption>
        <thead>
          <tr>
            <th scope="col">Name</th>
            <th scope="col">Description</th>
            <th scope="col">Language</th>
            <th scope="col">Chapter</th>
            <th scope="col">Capabilities</th>
            <th scope="col">Source</th>
            <th scope="col">Docs</th>
            <th scope="col">Live</th>
            <th scope="col">Editor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visible" :key="row.id">
            <th scope="row">{{ row.name }}</th>
            <td>{{ row.description }}</td>
            <td>{{ row.language }}</td>
            <td>{{ row.chapter }}</td>
            <td>
              <template v-if="dashIfEmpty(row.capabilities)">
                {{ row.capabilities.join(", ") }}
              </template>
              <span v-else class="sample-catalog__na">—<span class="visually-hidden"> Not available</span></span>
            </td>
            <td>
              <a :href="row.githubHref">GitHub</a>
            </td>
            <td>
              <a :href="withBase(row.docsHref)">Docs</a>
            </td>
            <td>
              <a v-if="row.rnwHref" :href="withBase(row.rnwHref)">React Native Web</a>
              <span v-else class="sample-catalog__na">—<span class="visually-hidden"> Not available</span></span>
            </td>
            <td>
              <a v-if="row.editorHref" :href="withBase(row.editorHref)">Editor</a>
              <span v-else class="sample-catalog__na">—<span class="visually-hidden"> Not available</span></span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.sample-catalog {
  margin-top: 1.25rem;
}
.sample-catalog__search {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}
.sample-catalog__search label {
  font-weight: 600;
}
.sample-catalog__search input {
  width: 100%;
  max-width: 36rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--vp-c-border);
  border-radius: 6px;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
  font-size: 1rem;
}
.sample-catalog__count {
  color: var(--vp-c-text-2);
  margin: 0 0 0.75rem;
}
.sample-catalog__scroll {
  overflow-x: auto;
}
.sample-catalog table {
  width: max-content;
  min-width: 100%;
  border-collapse: collapse;
  font-size: 0.92rem;
}
.sample-catalog th,
.sample-catalog td {
  border-bottom: 1px solid var(--vp-c-divider);
  padding: 0.55rem 0.7rem;
  text-align: left;
  vertical-align: top;
  overflow-wrap: break-word;
  word-break: break-word;
}
.sample-catalog thead th {
  background: var(--vp-c-bg-soft);
  position: sticky;
  top: 0;
  z-index: 1;
}
.sample-catalog tbody th {
  font-weight: 600;
  min-width: 10rem;
  max-width: 16rem;
}
.sample-catalog td:nth-child(2) {
  min-width: 16rem;
  max-width: 22rem;
}
.sample-catalog td:nth-child(4) {
  max-width: 14rem;
}
.sample-catalog td:nth-child(5) {
  max-width: 14rem;
}
.sample-catalog td:nth-child(6),
.sample-catalog td:nth-child(7),
.sample-catalog td:nth-child(8),
.sample-catalog td:nth-child(9) {
  white-space: nowrap;
}
.sample-catalog__na {
  color: var(--vp-c-text-3);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
