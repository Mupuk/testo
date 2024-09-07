const SBAndBBPRChecker = async ({ github, context }) => {
    await _SBAndBBPRChecker({github, contextRepo: context.repo, prNumber: context.issue.number});
};

const _SBAndBBPRChecker = async ({ github, contextRepo, prNumber }) => {
    const { data: pr } = await github.rest.pulls.get({
        ...contextRepo,
        pull_number: prNumber
    });

    // Check that its a SB or BB
    const match = pr.title.match(/^\[([SB]B)\]:/)?.[1]
    if (!match) return;

    const files = await github.rest.pulls.listFiles({
        ...contextRepo,
        prNumber,
    });

    console.log(files);
    // process.exit(1)
};

module.exports = {
    SBAndBBPRChecker,
    _SBAndBBPRChecker,
};