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

const createCurrentCompilerVersionLabel = async ({github, context, exec}) => {
  const { jaiVersion: getJaiVersion } = require('./utils.js');
  const jaiVersion = await getJaiVersion({ exec });
  await createLabel({github, context, labelName: jaiVersion});
  return jaiVersion;
}

module.exports = {
  createLabel,
  createCurrentCompilerVersionLabel
};
