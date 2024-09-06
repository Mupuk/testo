const SBAndBBPRChecker = async ({ github, context, exec, io }) => {
     const { data: pr } = await github.rest.pulls.get({
        ...context.repo,
        pull_number: context.issue.number
    });

    await _SBAndBBPRChecker({github, pr});
};

const _SBAndBBPRChecker = async ({ github, pr }) => {
    console.log(pr);
};

module.exports = {
    SBAndBBPRChecker,
    _SBAndBBPRChecker,
};