const createIssue = async ({github, context, exec}) => {
  await exec.exec('jai bugsuit.jai', [], options);
};

module.exports = createIssue;