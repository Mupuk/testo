function parseIssueCommentBody(issueBody) {
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
    ...context.repo,
    issue_number: context.issue.number
  });

  let parsedFields = parseIssueCommentBody(issue.body);

  parsedFields[1] = '✅'; // Emailed In

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

const handleJonSaid = async ({ github, context, comment }) => {
  // Specify the Berlin time zone and desired format
  let options = {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    // hour: '2-digit',
    // minute: '2-digit',
    // second: '2-digit'
  };
  // Format the date and time
  let time = new Intl.DateTimeFormat('en-CA', options).format(new Date());
  // Extract the date part (YYYY-MM-DD)
  let date = time.split(',')[0];

  const jonSaidBody = comment.body.split(/!JonSaid\s?/i)[1];
  if (jonSaidBody.length <= 25) return;

  const jonSaid = `\n\n${date}\nJon said:\n\`\`\`\n` + jonSaidBody + "\n```";

  // Get old issue body
  const { data: issue } = await github.rest.issues.get({
    ...context.repo,
    issue_number: context.issue.number
  });

  const result = issue.body + jonSaid;

  // Update comment
  await github.rest.issues.update({
    ...context.repo,
    issue_number: context.issue.number,
    body: result
  });
}

module.exports = {
  handleEmailedIn,
  handleJonSaid
};