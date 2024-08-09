const createIssue = async ({github, context, labelName}) => {
  const { jaiVersion: get_jai_version } = require('./.github/workflows/utils.js');
  
  const currentJaiVersion = await get_jai_version();
  const date = new Date().toISOString().split('T')[0];
  const prNumber = context.payload.pull_request.number;
  const prTitle = context.payload.pull_request.title;
  const prBody = context.payload.pull_request.body;

  const issueTitle = `${prTitle}`;
  const issueBody = `
  **Status:**
  
  | Test Name | Status | Emailed In | First Encounter | First Encounter Version | Last Encountered | Last Encountered Version | Fix Date | Fix Date Version |
  | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
  | EC1_polymorph_1.jai | Open | ❌ | ${date} | ${currentJaiVersion} | ${date} | ${currentJaiVersion} | - | - |
  `;

  // Create Tracking Issue
  const { data: issue } = await github.rest.issues.create({
    owner: context.repo.owner,
    repo: context.repo.repo,
    title: issueTitle,
    body: issueBody
  });

  // Since recursive workflows are not triggered when using GITHUB_TOKEN 
  // we do it manually again.
  // https://github.com/peter-evans/create-pull-request/blob/main/docs/concepts-guidelines.md#triggering-further-workflow-runs

  // Add Current Compiler Label
  await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: issue.number,
    labels: [ currentJaiVersion ]
  });

  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: `👋 Thanks for the contribution, please continue further discussion on this matter here: #${issue.html_url}!`
  })
}

module.exports = createIssue;