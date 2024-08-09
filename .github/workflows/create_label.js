const createLabel = async ({github, context, labelName}) => {
  // Check if the label exists
  const { data: labels } = await github.rest.issues.listLabelsForRepo({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });

  const labelExists = labels.some(label => label.name === labelName);

  // If the label doesn't exist, create it
  if (!labelExists) {
    await github.rest.issues.createLabel({
      owner: context.repo.owner,
      repo: context.repo.repo,
      name: labelName,
    });
  }
}

const createCurrentVersionLabel = async ({github, context}) => {
  const { jaiVersion: get_jai_version } = require('./.github/workflows/utils.js');
  const jai_version = await get_jai_version();
  await createLabel({github, context, labelName: jai_version});
  return jai_version;
}

module.exports = {
  createLabel,
  createCurrentVersionLabel
};
