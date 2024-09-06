const issueTrackerTemplate = `
**Status:**

| Status | Emailed In | First Encounter | First Encounter Version | Last Encountered | Last Encountered Version | Fix Date | Fix Version |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Open | {already_reported} | {firstEncounter} | {firstEncounterVersion} | {lastEncounter} | {lastEncounterVersion} | - | - |

Bug Type:
{bug_type}

Description:
{description}


Buggy Code:
\`\`\`c
{code}
\`\`\`


Workarounds:
\`\`\`c
{workaround}
\`\`\`
`;

function parsePrBody(text) {
  // match all checkbox values from the 3. checkbox onwards
  const regexEmailedIn = /(?<=(?:- \[[ X]\] .*\s){2})- \[([ X])\] /im;

  // match ### Bug Type followed by ####, capture all following lines until ###
  const regexBugType = /(?<=^### Bug Type[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexCategory = /(?<=^### Category[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexDescription = /(?<=^### Bug Desc[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexWorkaround = /(?<=^### Workaround[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexCode = /(?<=^### Short Code[\s\S]*####[\s\S]*$\s[\s\S]*```c\s)([\s\S]*?)\s```/im

  let parsedData = {
    already_reported: (text.match(regexEmailedIn)?.[1] || ' ').toLowerCase() === 'x'  ? '✅' : '❌',
    issue_number: '',
    bug_type: text.match(regexBugType)?.[1] || '-',
    categories: text.match(regexCategory)?.[1] || '-',
    description: text.match(regexDescription)?.[1] || '-',
    workaround: text.match(regexWorkaround)?.[1] || '-',
    code: text.match(regexCode)?.[1] || '-'
  }

  return parsedData;
}

const createTrackingIssueOnPRMerge = async ({github, context, exec}) => {
  const { jaiVersion: getJaiVersion, format } = require('./utils.js');
  const currentVersion = await getJaiVersion({ exec });
  
  const date = new Date().toISOString().split('T')[0];
  const prNumber = context.payload.pull_request.number;
  const prTitle = context.payload.pull_request.title;
  const prBody = context.payload.pull_request.body;

  const parsedBody = parsePrBody(prBody);
  parsedBody.firstEncounter = date;// this is just thre first reported date, even if bug itself is older
  parsedBody.firstEncounterVersion = currentVersion; //could get reset by test to an even later version
  parsedBody.lastEncounter = date;
  parsedBody.lastEncounterVersion = currentVersion;

  const issueTitle = `${prTitle}`;
  const issueBody = format(issueTrackerTemplate, parsedBody);

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
    labels: [ currentVersion ]
  });

  await github.rest.issues.createComment({
    issue_number: context.issue.number,
    owner: context.repo.owner,
    repo: context.repo.repo,
    body: `👋 Thanks for the contribution, please continue further discussion on this matter here: #${issue.html_url}!`
  })
}

module.exports = createTrackingIssueOnPRMerge;