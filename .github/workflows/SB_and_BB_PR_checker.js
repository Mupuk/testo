const SBAndBBPRChecker = async ({ github, context }) => {
    await _SBAndBBPRChecker({github, contextRepo: context.repo, prNumber: context.issue.number});
};

const _SBAndBBPRChecker = async ({ github, contextRepo, prNumber }) => {
     const { data: pr } = await github.rest.pulls.get({
        ...contextRepo,
        pull_number: prNumber
    });

    console.log(pr);
};

module.exports = {
    SBAndBBPRChecker,
    _SBAndBBPRChecker,
};