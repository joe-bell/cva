<script lang="ts">
  import Button from "./components/button.svelte";

  const intents = [undefined, "primary", "secondary"] as const;
  const sizes = [undefined, "medium", "small"] as const;
  const isDisabled = [false, true] as const;
</script>

<table class="variant-table">
  <thead>
    <tr>
      <th />
      <th />
      {#each intents as intent}
        <th scope="col">{intent || "default"}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each isDisabled as disabled}
      {#each sizes as size, index}
        <tr>
          {#if index === 0}
            <th scope="rowgroup" rowSpan={3}>
              {disabled ? "disabled" : "enabled"}
            </th>
          {/if}
          <th scope="row">{size || "default"}</th>
          {#each intents as intent}
            <td>
              <Button
                {...intent && { intent }}
                {...size && { size }}
                {...disabled && { disabled }}
              >
                {intent || "default"} button
              </Button>
            </td>
          {/each}
        </tr>
      {/each}
    {/each}
  </tbody>
</table>

<style>
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
