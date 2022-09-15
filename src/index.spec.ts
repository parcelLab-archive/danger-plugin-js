/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import parcellab from "./index";
import { Severity } from "./types";

// type DangerLog = (message: string) => void | undefined;

interface Global {
	danger: {
		git: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			modified_files: string[];
		};
		github: {
			commits: {
				commit: {
					message: string;
				};
			}[];
			pr: {
				additions: number;
				deletions: number;
				body: string;
				title: string;
			};
		};
	};
	warn: jest.Mock;
	message: jest.Mock;
	fail: jest.Mock;
	markdown: jest.Mock;
}

declare const global: Global;

describe("parcellab()", () => {
	const danger = {
		git: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			modified_files: ["file1.md", "file2.js"],
		},
		github: {
			commits: [
				{ commit: { message: "feat: commit 1" } },
				{ commit: { message: "fix(my-app1): commit 2" } },
				{ commit: { message: "chore(): commit 3" } },
				{ commit: { message: "docs(my-app2): commit 4" } },
				{ commit: { message: "fix(my-app): commit 4" } },
			],
			pr: {
				additions: 200,
				deletions: 100,
				body: "My PR body that is longer than 10 characters. ![image](myimage.png) [JIRA-1234]",
				title: "feat(my-app): my description",
			},
		},
	};

	beforeEach(() => {
		global.warn = jest.fn();
		global.message = jest.fn();
		global.fail = jest.fn();
		global.markdown = jest.fn();
	});

	afterEach(() => {
		global.warn.mockClear();
		global.message.mockClear();
		global.fail.mockClear();
		global.markdown.mockClear();
	});

	it("Messages if everything is fine", async () => {
		global.danger = {
			...danger,
			github: {
				...danger.github,
				commits: [
					...danger.github.commits,
					{ commit: { message: "no category 1" } },
					{ commit: { message: "no category 2" } },
				],
				pr: {
					...danger.github.pr,
				},
			},
		};

		await parcellab({ conventional: { severity: Severity.Disable } });

		expect(global.message).not.toHaveBeenCalled();
		expect(global.markdown.mock.calls[0]).toMatchSnapshot();
		expect(global.warn).not.toHaveBeenCalled();
		expect(global.fail).not.toHaveBeenCalled();
	});

	it("Fails if there is no proper description", async () => {
		global.danger = {
			...danger,
			github: {
				...danger.github,
				pr: {
					...danger.github.pr,
					body: "[JIR-1]",
				},
			},
		};

		await parcellab();

		expect(global.warn).not.toHaveBeenCalled();
		expect(global.fail).toHaveBeenCalledTimes(1);
		expect(global.fail).toHaveBeenCalledWith(
			expect.stringMatching(/^PR needs a proper description./)
		);
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Fails if there are commits that do not match the conventional style", async () => {
		global.danger = {
			...danger,
			github: {
				...danger.github,
				commits: [
					...danger.github.commits,
					{ commit: { message: "no category 1" } },
					{ commit: { message: "no category 2" } },
				],
				pr: {
					...danger.github.pr,
				},
			},
		};

		await parcellab();

		expect(global.warn).not.toHaveBeenCalled();
		expect(global.fail).toHaveBeenCalledTimes(2);
		expect(global.fail).toHaveBeenCalledWith(
			expect.stringMatching(
				/^Message ".*" does not follow the \[Conventional Commits]/
			)
		);
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Messages if title is too long", async () => {
		global.danger = {
			...danger,
			github: {
				...danger.github,
				pr: {
					...danger.github.pr,
					title: "feat(my-app): my description is a very long description and it will fail long long",
				},
			},
		};

		await parcellab({ prLint: { severity: Severity.Message } });

		expect(global.fail).not.toHaveBeenCalled();
		expect(global.warn).not.toHaveBeenCalled();
		expect(global.message).toHaveBeenCalledTimes(1);
		expect(global.message).toHaveBeenCalledWith(
			expect.stringMatching(/^PR title is longer than 72 characters./)
		);
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Fails if title is not compliant with conventional commit format", async () => {
		global.danger = {
			...danger,
			github: {
				...danger.github,
				pr: {
					...danger.github.pr,
					title: "feat(my-app): My description is upper case",
				},
			},
		};

		await parcellab();

		expect(global.warn).not.toHaveBeenCalled();
		expect(global.fail).toHaveBeenCalledTimes(1);
		expect(global.fail).toHaveBeenCalledWith(
			expect.stringMatching(
				/^Message ".*" does not follow the \[Conventional Commits]/
			)
		);
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Warns if title does not have a scope", async () => {
		global.danger = {
			...danger,
			github: {
				...danger.github,
				pr: {
					...danger.github.pr,
					title: "feat: my description",
				},
			},
		};

		await parcellab();

		expect(global.warn).toHaveBeenCalledWith(
			expect.stringMatching(/^This PR does not have a scope./)
		);
		expect(global.fail).not.toHaveBeenCalled();
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Warns if there is no reference to a JIRA issue", async () => {
		global.danger = {
			...danger,
			github: {
				...danger.github,
				pr: {
					...danger.github.pr,
					body: "my description without JIRA ticket",
				},
			},
		};

		await parcellab();

		expect(global.warn).toHaveBeenCalledWith(
			expect.stringMatching(/^Is this PR related to a JIRA issue?/)
		);
		expect(global.fail).not.toHaveBeenCalled();
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Warns if there is a big number of commits", async () => {
		global.danger = danger;

		await parcellab({ branchSize: { maxCommits: 3 } });

		expect(global.warn).toHaveBeenCalledWith(
			":exclamation: There are a lot of commits, which is a sign that changes can get out of hand."
		);
		expect(global.fail).not.toHaveBeenCalled();
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Warns if there is a big number of line changes", async () => {
		global.danger = danger;

		await parcellab({ branchSize: { maxLines: 100 } });

		expect(global.warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/^:exclamation: This PR has \d+ additions and \d+ deletions. You should split it in smaller PRs./
			)
		);
		expect(global.fail).not.toHaveBeenCalled();
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Warns if there are a lot of modified files", async () => {
		global.danger = danger;

		await parcellab({ branchSize: { maxFiles: 1 } });

		expect(global.warn).toHaveBeenCalledWith(
			":exclamation: There are a lot of modified files, consider splitting this change in smaller PRs."
		);
		expect(global.fail).not.toHaveBeenCalled();
		expect(global.markdown).toHaveBeenCalled();
	});

	it("Removes duplicates from same commit type", async () => {
		global.danger = {
			...danger,
			github: {
				...danger.github,
				commits: [
					...danger.github.commits,
					{ commit: { message: "style: format files" } },
					{ commit: { message: "style: format files" } },
				],
				pr: {
					...danger.github.pr,
				},
			},
		};

		await parcellab({ conventional: { severity: Severity.Disable } });

		const content = global.markdown.mock.calls[0][0] as string;
		expect(content.match(/format files/g)).toHaveLength(1);
		expect(global.markdown.mock.calls[0]).toMatchSnapshot();
	});
});
