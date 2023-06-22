<script setup lang="ts">
import Button from "./components/Button.vue";

const intents = [undefined, "primary", "secondary"] as const;
const sizes = [undefined, "medium", "small"] as const;
</script>

<template>
  <table class="variant-table">
    <thead>
      <tr>
        <th></th>
        <th v-for="intent in intents">
          {{ intent || "default" }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="size in sizes">
        <th scope="row">{{ size || "default" }}</th>

        <td v-for="intent in intents">
          <Button :intent="intent" :size="size"
            >{{ intent || "default" }} button
          </Button>
        </td>
      </tr>
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
