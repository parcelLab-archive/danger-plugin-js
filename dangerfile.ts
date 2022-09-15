import parcellab, { Severity } from ".";

(void async function dangerReport() {
	await parcellab({
		prLint: {
			scoped: false,
		},
		jira: {
			severity: Severity.Disable,
		},
	});
})();
