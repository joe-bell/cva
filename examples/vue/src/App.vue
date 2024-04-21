<script setup lang="ts">
import Button from "./components/Button.vue";

const intents = [undefined, "primary", "secondary"] as const;
const sizes = [undefined, "medium", "small"] as const;
const isDisabled = [undefined, ""] as const;
</script>

<template>
  <table class="variant-table">
    <thead>
      <tr>
        <th></th>
        <th></th>
        <th v-for="intent in intents">
          {{ intent || "default" }}
        </th>
      </tr>
    </thead>
    <tbody>
      <template v-for="disabled in isDisabled">
        <tr v-for="(size, index) in sizes">
          <th v-if="index === 0" scope="rowgroup" rowspan="3">
            {{ typeof disabled === "undefined" ? "enabled" : "disabled" }}
          </th>

          <th scope="row">{{ size || "default" }}</th>

          <td v-for="intent in intents">
            <Button :disabled="disabled" :intent="intent" :size="size"
              >{{ intent || "default" }} button
            </Button>
          </td>
        </tr>
      </template>
    </tbody>
  </table>
</template>

<style scoped>
.variant-table {
  position: relative;
  height: max-content;
  width: max-content;
  align-self: center;
  justify-self: center;
}

.variant-table :where(th, td) {
  padding: 0.5rem;
}
</style>
