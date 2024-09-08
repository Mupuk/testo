const issueTrackerTemplate = `
**Status:**

| Status | Emailed In | First Encounter | First Encounter Version | Last Encountered | Last Encountered Version | Fix Date | Fix Version |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Open | {already_reported} | {firstEncounter} | {firstEncounterVersion} | {lastEncounter} | {lastEncounterVersion} | - | - |

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

  // match ### Category followed by ####, capture all following lines until ###
  const regexCategory = /(?<=^### Category[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexDescription = /(?<=^### Bug Desc[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexWorkaround = /(?<=^### Workaround[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexCode = /(?<=^### Short Code[\s\S]*####[\s\S]*$\s[\s\S]*```c\s)([\s\S]*?)\s```/im

  let parsedData = {
    already_reported: (text.match(regexEmailedIn)?.[1] || ' ').toLowerCase() === 'x'  ? '✅' : '❌',
    issue_number: '',
    categories: text.match(regexCategory)?.[1] || '-',
    description: text.match(regexDescription)?.[1] || '-',
    workaround: text.match(regexWorkaround)?.[1] || '-',
    code: text.match(regexCode)?.[1] || '-'
  }

  return parsedData;
}

const createTrackingIssueOnPRMerge = async ({github, contextRepo, prNumber}) => {
  // get PR
  const { data: pr } = await github.rest.pulls.get({
    ...contextRepo,
    pull_number: prNumber
  });
  
  // parse PR body
  const date = new Date().toISOString().split('T')[0];
  const parsedBody = parsePrBody(pr.body);
  parsedBody.firstEncounter = date;// this is just the first reported date, even if bug itself is older
  parsedBody.firstEncounterVersion = currentVersion; //could get reset by test to an even later version
  parsedBody.lastEncounter = date;
  parsedBody.lastEncounterVersion = currentVersion;

  
  // Create Tracking Issue
  const issueTitle = `${pr.title}`;
  const issueBody = format(issueTrackerTemplate, parsedBody);
  const { data: issue } = await github.rest.issues.create({
    ...contextRepo,
    title: issueTitle,
    body: issueBody
  });

  // Since recursive workflows are not triggered when using GITHUB_TOKEN 
  // we do it manually again.
  // https://github.com/peter-evans/create-pull-request/blob/main/docs/concepts-guidelines.md#triggering-further-workflow-runs

  // Add Current Compiler Label
  // const { jaiVersion: getJaiVersion, format } = require('./utils.js');
  // const currentVersion = await getJaiVersion({ exec });
  // await github.rest.issues.addLabels({
  //   ...context.repo,
  //   issue_number: issue.number,
  //   labels: [ currentVersion ]
  // });

  await github.rest.issues.createComment({
    ...contextRepo,
    issue_number: context.issue.number,
    body: `👋 Thanks for the contribution, please continue further discussion on this matter here: #${issue.html_url}!`
  })

  return issue.number;
}

module.exports = createTrackingIssueOnPRMerge;