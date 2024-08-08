function parseIssueBody(issueBody) {
  // Split the input text into lines
  const lines = issueBody.split('\n');
  let pipeLines = lines.filter(line => line.startsWith('|'));
  // Discard the first two lines (header and table)
  pipeLines = pipeLines.slice(2);
  console.log(pipeLines);

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

  const parsedFields = parseIssueBody(issue.body);
  console.log("Res");
  console.log(parsedFields);

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

  console.log("2", lines.join('\n'));
}

module.exports = {
  handleEmailedIn,
};