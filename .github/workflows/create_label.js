// @todo add colors
const createLabel = async ({github, context, labelName}) => {
  await createLabels({github, context, labelNames: [labelName]})
}

const createLabels = async ({ github, context, labelNames }) => {
  console.log('creating Labels', labelNames);
  // Fetch all existing labels
  const { data: labels } = await github.rest.issues.listLabelsForRepo({
    owner: context.repo.owner,
    repo: context.repo.repo,
  });
  // console.log('Found: ', labels);

  // Loop through the array of label names and create any that don't exist
  for (const labelName of labelNames) {
    const labelExists = labels.some(label => label.name.toLowerCase() === labelName.toLowerCase());

    // If the label doesn't exist, create it
    if (!labelExists) {
      console.log("creating: ", labelName);
      await github.rest.issues.createLabel({
        owner: context.repo.owner,
        repo: context.repo.repo,
        name: labelName,
      });
    }
  }
};

const createCurrentCompilerVersionLabel = async ({github, context, exec}) => {
  const { jaiVersion: getJaiVersion } = require('./utils.js');
  const jaiVersion = await getJaiVersion({ exec });
  await createLabel({github, context, labelName: jaiVersion});
  return jaiVersion;
}

module.exports = {
  createLabel,
  createLabels,
  createCurrentCompilerVersionLabel
};
