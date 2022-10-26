const parcellab = require("@parcellab/danger-plugin").default;

(async () => {
	await parcellab({
		jira: {
			severity: "disable",
		},
		prLint: {
			scoped: false,
		},
	});
})();
