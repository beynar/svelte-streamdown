<script lang="ts">
	// Test-only: a tag's component, to tell one that reached it from its source shown as text.
	let { props }: { props: { id?: string; label?: string } } = $props();
</script>

<span data-testid="mention" data-id={props.id}>{props.label}</span>
