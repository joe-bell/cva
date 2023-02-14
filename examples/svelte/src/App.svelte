<script lang="ts">
  import Button from "./components/button.svelte";

  const intents = [undefined, "primary", "secondary"] as const;
  const sizes = [undefined, "medium", "small"] as const;
</script>

<table class="variant-table">
  <thead>
    <tr>
      <th />
      {#each intents as intent}
        <th scope="col">{intent || "default"}</th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each sizes as size}
      <tr>
        <th scope="row">{size || "default"}</th>
        {#each intents as intent}
          <td>
            <Button {...intent && { intent }} {...size && { size }}>
              {intent || "default"} button
            </Button>
          </td>
        {/each}
      </tr>
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
