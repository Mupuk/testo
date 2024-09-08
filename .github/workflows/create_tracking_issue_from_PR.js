const issueTrackerTemplate = `
| Status | Emailed In |  Reported Version | Last Broken Platforms | Last Encountered Version | Fix Version |
| :---: | :---: | :---: | :---: | :---: | :---: |
| Open | {alreadyReported} | - | - | - | - |

### Description

{description}



### Buggy Code
\`\`\`c
{code}
\`\`\`


### Workarounds
\`\`\`c

{workaround}

\`\`\`

### History
| Passed Test | Platforms  | Date | Version | Error Code |
| :--: | :-------------: | :-------------: | :------------: | :------------: |
`;

// Parse PR Body of SB/BB template
function parsePrBody(text) {
  // match all checkbox values from the 3. checkbox onwards
  const regexEmailedIn = /(?<=(?:- \[[ X]\] .*\s){2})- \[([ X])\] /im;

  // match ### Category followed by ####, capture all following lines until ###
  const regexCategory = /(?<=^### Category[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexDescription = /(?<=^### Bug Desc[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexWorkaround = /(?<=^### Workaround[\s\S]*####[\s\S]*$\s)([\s\S]*?)\s###/im;
  const regexCode = /(?<=^### Short Code[\s\S]*####[\s\S]*$\s[\s\S]*```c\s)([\s\S]*?)\s```/im

  let parsedData = {
    alreadyReported: (text.match(regexEmailedIn)?.[1] || ' ').toLowerCase() === 'x'  ? '✅' : '❌',
    categories: text.match(regexCategory)?.[1] || '-',
    description: text.match(regexDescription)?.[1] || '-',
    workaround: text.match(regexWorkaround)?.[1] || '-',
    code: text.match(regexCode)?.[1] || '-'
  }

  return parsedData;
}

const createTrackingIssueFromPR = async ({github, contextRepo, prNumber}) => {
  // get PR
  const { data: pr } = await github.rest.pulls.get({
    ...contextRepo,
    pull_number: prNumber
  });
  
  // parse PR body
  const date = new Date().toISOString().split('T')[0];
  const parsedBody = parsePrBody(pr.body);
  
  // Create Tracking Issue
  const { format } = require('./utils.js');
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
    issue_number: prNumber,
    body: `👋 Thanks for the contribution, please continue further discussion on this matter here: #${issue.html_url}!`
  })

  return issue.number;
}

module.exports = createTrackingIssueFromPR;