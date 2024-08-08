const createLabel = async ({github, context, labelName}) => {
  // TEMP
  // Specify the Berlin time zone and desired format
  let options = {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };
  // Format the date and time
  let berlinTime = new Intl.DateTimeFormat('en-CA', options).format(new Date());
  // Extract the date part (YYYY-MM-DD)
  let berlinDate = berlinTime.split(',')[0];
  console.log(berlinTime);
  // TEMP
  
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
  const get_jai_version = require('./.github/workflows/jai_version.js');
  const jai_version = await get_jai_version();
  await createLabel({github, context, labelName: jai_version});
  return jai_version;
}

module.exports = {
  createLabel,
  createCurrentVersionLabel
};
