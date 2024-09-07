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
  const isSingleFile = filePaths.length === 1 && (/compiler_bugs\/EC\d+_\d+\.jai/).test(filePaths[0]);

  const folders = files.map(file => file.split('/').slice(0, -1).join('/'));
  const uniqueFolders = [...new Set(folders)];
  const isSingleFolderWithFirstJaiFile = uniqueFolders.length === 1
    && (/^compiler_bugs\/[^\/]+\//).test(uniqueFolders[0])
    && files.some(f => (/^compiler_bugs\/[^\/]+\/first.jai/).test(f));

  console.log(isSingleFile);
  console.log(isSingleFolderWithFirstJaiFile);
  console.log(files);

  if (!isSingleFile && !isSingleFolderWithFirstJaiFile) {
    process.exit(1);
  }
};

module.exports = {
  SBAndBBPRChecker,
  _SBAndBBPRChecker,
};