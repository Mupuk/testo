const createIssue = async ({github, context}) => {
  await exec.exec('jai bugsuit.jai', [], options);
};

module.exports = createIssue;