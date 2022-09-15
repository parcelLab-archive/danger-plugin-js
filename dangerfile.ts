import parcellab from "./src";
import { Severity } from "./src/types";

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
