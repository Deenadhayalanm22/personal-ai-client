<script>
    let backendResponse = "";

    async function callBackend() {
        const res = await fetch("http://localhost:8080/transaction");
        backendResponse = await res.text();
    }
</script>

<h1>Backend Test</h1>
<button on:click={callBackend}>Call Backend</button>

<p>{backendResponse}</p>