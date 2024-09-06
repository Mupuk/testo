const SBAndBBPRChecker = async ({ github, context }) => {
    await _SBAndBBPRChecker({github, prNumber: context.issue.number});
};

const _SBAndBBPRChecker = async ({ github, prNumber }) => {
     const { data: pr } = await github.rest.pulls.get({
        ...context.repo,
        pull_number: prNumber
    });

    console.log(pr);
};

module.exports = {
    SBAndBBPRChecker,
    _SBAndBBPRChecker,
};