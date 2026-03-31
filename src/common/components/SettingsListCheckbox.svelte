<script lang="ts">
  interface Props {
    checked: boolean;
    onChange: () => void;
    label: string;
    title?: string;
  }

  let { checked, onChange, label, title }: Props = $props();

  const uid = $props.id();
</script>

<li {title}>
  <input id="{uid}-checkbox" type="checkbox" {checked} onchange={onChange} />
  <label for="{uid}-checkbox">{label}</label>
</li>
