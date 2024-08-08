function parseIssueBody(issueBody) {
  // Split the input text into lines
  const lines = issueBody.split('\n');
  let pipeLines = lines.filter(line => line.startsWith('|'));
  // Discard the first two lines (header and table)
  pipeLines = pipeLines.slice(2);

  // Extract the row that contains the variable values
  const regex = /\|?(.*?)\|/gm;
  const fields = [...pipeLines[0].matchAll(regex)].map(match => match[1]);

  return fields
}

const handleEmailedIn = async ({ github, context }) => {

  const { data: issue } = await github.rest.issues.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number
  });

  let parsedFields = parseIssueBody(issue.body);

  parsedFields[2] = '✅'; // Emailed In

  let modifiedRow = '|' + parsedFields.join('|') + '|';

  // Reassamble updated post
  let lines = issue.body.split('\n');

  // find data row
  let headerIndex = -1;
  for (const [index, line] of lines.entries()) {
    if (line.startsWith('|')) {
      headerIndex = index;
      break;
    }
  }

  lines.splice(headerIndex + 2, 1, modifiedRow);
  const result = lines.join('\n');

  // Update comment
  await github.rest.issues.update({
    ...context.repo,
    issue_number: context.issue.number,
    body: result
  });

}

const handleJonSaid = async ({ github, context, core }) => {
  const comment = core.getInput('comment', { required: true });
  console.log(comment);
  const { data: issue } = await github.rest.issues.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number
  });
}

module.exports = {
  handleEmailedIn,
  handleJonSaid
};