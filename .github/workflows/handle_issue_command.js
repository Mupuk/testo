function parseIssueBody(issueBody) {
  // Split the input text into lines
  const lines = issueBody.split('\n');
  let pipeLines = lines.filter(line => line.startsWith('|'));
  // Discard the first two lines (header and table)
  pipeLines = pipeLines.slice(2);
  console.log('7', pipeLines);

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
  console.log("Res");
  console.log(parsedFields);

  parsedFields[2] = '✅'; // Emailed In

  let modifiedRow = '|' + parsedFields.join('|') + '|';
  console.log('3', modifiedRow);

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

  console.log("1", lines[headerIndex + 2]);
  lines.splice(headerIndex + 2, 1, modifiedRow);
  const result = lines.join('\n');
  console.log("2", result);

  // Get all comments on the issue
  const { data: comments } = await github.rest.issues.listComments({
    ...context.repo,
    issue_number: context.issue.number
  });
  console.log('comments', comments);

  // Update comment
  await github.rest.issues.update({
    ...context.repo,
    issue_number: context.issue.number,
    body: result
  });

}

module.exports = {
  handleEmailedIn,
};