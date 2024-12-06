// :trackerTemplate
const issueTrackerTemplate = `
| Emailed In |  Reported Version | Latest Broken Version | Latest Broken Platforms  | Fix Version |
| :---: | :---: | :---: | :---: | :---: |
| {alreadyReported} | - | - | - | - |

### Description
\`\`\`
{description}
\`\`\`

### Buggy Code
\`\`\`c
{code}
\`\`\`

### Workarounds
\`\`\`c
{workaround}
\`\`\`

### History V1
| Version | Windows | Linux | Mac |
| :-------: | :-------------: | :-------------: | :-------------: |
| - | - | - | - |
`.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

// Parse PR Body of SB/BB template
function parsePrBody(text) {
  // match the x inside the 3. checkbox (hoepfully emailed in)
  const regexEmailedIn = /(?<=(?:- \[[ X]\] .*\s){2}- \[)([ X])(?=\])/im;

  const regexDescription =
    /(?<=^### Bug Description[\s\S]*$\s\s)([\s\S]*?)(?=\s\s###)/im;
  const regexWorkaround =
    /(?<=^### Workarounds[\s\S]*$\s\s)([\s\S]*)/im; // greedy match since its at the bottom
  const regexCode =
    /(?<=^### Short Code Snippet[\s\S]*$\s\s```c\s)([\s\S]*?)(?=\s```\s+###)/im; // match the code only

  let parsedData = {
    alreadyReported:(text.match(regexEmailedIn)?.[1] || ' ').toLowerCase() === 'x' ? '✅' : '❌',
    description: (text.match(regexDescription)?.[1] || '-').replace(/_No response_/, '-'),
    workaround: (text.match(regexWorkaround)?.[1] || '-').replace(/_No response_/, '-'),
    code: (text.match(regexCode)?.[1] || '-').replace(/_No response_/, '-'),
  };

  return parsedData;
}

const createTrackingIssueFromPR = async ({ github, context }) => {
  // Search of existing tracker, sadly we dont know the trackers issue number
  const query = `repo:${context.repo.owner}/${context.repo.repo} is:issue in:title TRACKER ${context.issue.number}`;
  const searchResults = await github.rest.search.issuesAndPullRequests({
    q: query,
    per_page: 100 // Fetch up to 100 results
  });

  const existingIssue = searchResults.data.items;
  console.log('existingIssue', existingIssue);
  if (existingIssue.length > 0) {
    if (existingIssue.length > 1) {
      console.warn('Multiple trackers found, this should not happen!');
    }
    console.log('Tracker already exists, skipping');
    return existingIssue[0].number;
  }



  // get PR - only for the body description etc!
  // @todo it could have changed, it wouldnt break anything,
  // but it would be inconsistent :/ maybe this is solved
  // when we use concurency to cancel pending workflows
  // and use the pr data from the validation step
  const { data: pr } = await github.rest.pulls.get({
    ...context.repo,
    pull_number: context.issue.number,
  });
  pr.body = pr.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // parse PR body
  const date = new Date().toISOString().split('T')[0];
  const parsedBody = parsePrBody(pr.body);
  console.log('parsed PR Body', parsedBody);
  


  
  // Create Tracking Issue
  const { format } = require('./_utils.js');
  const issueTitle = `[TRACKER] #${context.issue.number}`; // if this change also change the tracker search query
  const issueBody = format(issueTrackerTemplate, parsedBody);
  const { data: issue } = await github.rest.issues.create({
    ...context.repo,
    title: issueTitle,
    body: issueBody,
    labels: pr.labels.map((label) => label.name),
  });


  
  // Get issue, since its a converted issue, and we want to get the original creator
  const { data: originalIssue } = await github.rest.issues.get({
    ...context.repo,
    issue_number: context.issue.number,
  });
  const originialIssueCreator = originalIssue.user.login;
  console.log('originialIssueCreator', originialIssueCreator);

  // Notify the original issue creator
  await github.rest.issues.createComment({
    ...context.repo,
    issue_number: context.issue.number,
    body: `👋 Thanks for the contribution @${originialIssueCreator}. We will notify you when this issue was fixed, or breaks again!`,
  });

  return issue.number;
};

module.exports = createTrackingIssueFromPR;
