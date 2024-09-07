const SBAndBBPRChecker = async ({ github, context }) => {
  await _SBAndBBPRChecker({ github, contextRepo: context.repo, prNumber: context.issue.number });
};

// @todo test if folder checks are correct
const _SBAndBBPRChecker = async ({ github, contextRepo, prNumber }) => {
  const { data: pr } = await github.rest.pulls.get({
    ...contextRepo,
    pull_number: prNumber
  });

  // Check that its a SB or BB
  const match = pr.title.match(/^\[([SB]B)\]:/)?.[1]
  if (!match) return;

  const fileResponse = await github.rest.pulls.listFiles({
    ...contextRepo,
    pull_number: prNumber,
    per_page: 100
  });

  const filePaths = fileResponse.data.map(file => file.filename);

  if (filePaths.length === 100) {
    await github.rest.issues.createComment({
      ...contextRepo,
      issue_number: prNumber,
      body: `@Mupu, This PR has more than 100 files, please make this work and re-run the checks.`
    })
    process.exit(1);
  }

  const isSingleFile = filePaths.length === 1 && (/compiler_bugs\/EC\d+_\d+\.jai/).test(filePaths[0]);

  const folders = filePaths.map(file => file.split('/').slice(0, -1).join('/'));
  const uniqueFolders = [...new Set(folders)];
  const isSingleFolderWithFirstJaiFile = uniqueFolders.length === 1
    && (/^compiler_bugs\/[^\/]+\//).test(uniqueFolders[0])
    && filePaths.some(f => (/^compiler_bugs\/[^\/]+\/first.jai/).test(f));

  console.log(isSingleFile);
  console.log(isSingleFolderWithFirstJaiFile);
  console.log(fileResponse);

  if (!isSingleFile && !isSingleFolderWithFirstJaiFile) {
    process.exit(1);
  }
};

const validateAddedTestAndMergeOnSuccess = async ({ github, exec, contextRepo, prNumber }) => {
  console.log(`Validating Pull Request #${prNumber}...`);


  // check that test crashes / is != expected return code
  // get files so we know what to run




  // if test crashes, merge PR
  // const mergeResponse = await github.pulls.merge({
  //   owner: context.repo.owner,
  //   repo: context.repo.repo,
  //   pull_number: prNumber,
  //   merge_method: 'merge'  // Use 'merge', 'squash', or 'rebase' depending on your needs
  // });

  // if (mergeResponse.status === 200) {
  //   console.log(`Pull Request #${prNumber} merged successfully.`);
  // } else {
  //   console.error(`Failed to merge Pull Request #${prNumber}.`);
  //   process.exit(1);  // Exit with failure
  // }
};

module.exports = {
  SBAndBBPRChecker,
  _SBAndBBPRChecker,
  validateAddedTestAndMergeOnSuccess
};