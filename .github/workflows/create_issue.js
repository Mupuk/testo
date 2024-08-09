function parsePrBody(text) {
  // match all checkbox values from the 3. checkbox onwards
  const reg_emailed_in = /(?<=(?:- \[[ X]\] .*\s){2})- \[([ X])\] /igm;

  // match ### Bug Type followed by ####, capture all following lines until ###
  const reg_bug_type = /(?<=^### Bug Type[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const reg_category = /(?<=^### Category[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const reg_description = /(?<=^### Bug Desc[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const reg_workaround = /(?<=^### Workaround[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const reg_code = /(?<=^### Short Code[\s\S]*####[\s\S]*$\s[\s\S]*```c\s)([\s\S]*?)\s```/im

  let parsedData = {
    already_reported: text.match(reg_emailed_in)?.[1] || '',
    issue_number: '',
    bug_type: text.match(reg_bug_type)?.[1] || '',
    categories: text.match(reg_category)?.[1] || '',
    description: text.match(reg_description)?.[1] || '',
    workaround: text.match(reg_workaround)?.[1] || '',
    code: text.match(reg_code)?.[1] || ''
  }

  return parsedData;
}

const createIssue = async ({github, context}) => {
  const { jaiVersion: get_jai_version, format, prTemplate } = require('./utils.js');
  
  const currentJaiVersion = await get_jai_version();
  const date = new Date().toISOString().split('T')[0];
  const prNumber = context.payload.pull_request.number;
  const prTitle = context.payload.pull_request.title;
  const prBody = context.payload.pull_request.body;

  const parsed_body = parsePrBody(prBody);

  const issueTitle = `${prTitle}`;
  const issueBody = format(prTemplate, parsed_body);

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