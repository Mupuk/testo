function parseIssueBody(text) {
  const sections = text.split('### ').slice(1); // Split into sections by headings
  const parsedData = [];

  sections.forEach(section => {
    const lines = section.trim().split('\n');
    const heading = lines.shift().trim(); // First line is the heading
    const content = lines.join('\n').trim(); // Remaining lines are the content

    if (heading === 'General') {
      // Parse checkboxes
      const checkboxes = lines
        .filter(line => line.trim().length > 0)
        .map(line => {
          const isChecked = line.toLowerCase().includes('[x]');
          return {
            label: line.replace(/- \[.\]\s*/, '').trim(),
            checked: isChecked
          };
        });
      parsedData.push(checkboxes);
    } else if (heading === 'Short Code Snippet') {
      // Extract text inside ```c``` block
      const codeBlockMatch = content.match(/```c([\s\S]*?)```/);
      parsedData.push(codeBlockMatch ? codeBlockMatch[1].trim() : '');
    } else {
      // Parse other sections
      parsedData.push(content);
    }
  });

  return parsedData;
}

// format a string that replaces '{xxx}' with object properties of name 'xxx'
//
// Example:
// 
// const template = 'Hello, {name}! Welcome to {place}.';
// const params = {
//   name: 'Alice',
//   place: 'Wonderland'
// };
//
// const result = format(template, params);
// console.log(result); // Outputs: "Hello, Alice! Welcome to Wonderland."
function format(template, params) {
  return template.replace(/\{(.*?)}/g, (match, p1) => params[p1.trim()] || '');
}

const pull_request_template = `
## General

- [x] I've looked for similar bugs
- [x] This bug fits into a single file
- [{already_reported}] I've already reported the bug to Jon

## Related Issues
Closes: #{issue_number}

## Bug Type
#### What type of bug is this? Delete the others.
- {bug_type}

## Categorization
#### What category does this bug belong to the most / What feature triggered the bug? Delete the others.
- {categories}

## Bug Description
#### Please fill this out if it is a more complicated bug.

{description}

## Workaround
#### If you have a workaround, please share it here.

{workaround}

## Short Code Snipped
#### Please put your code to reproduce the bug here. Only use it if it is a short bug(one file).

\`\`\`c
{code}
\`\`\`
`


const createPr = async ({github, context}) => {
  // Get issue
  const { data: issue } = await github.rest.issues.get({
    ...context.repo,
    issue_number: context.issue.number
  });
  // console.log(issue);

  // Get title text
  const regex = /(?:\[SB\]): (.{5,})/gmi;
  const match = [...issue.title.matchAll(regex)][0] || [];
  const title_text = match[1]; // maybe undefined
  if (title_text === undefined) return;

  const parsed_body = parseIssueBody(issue.body);

  const params = {
    already_reported: parsed_body[0][2].checked ? 'X' : ' ',
    issue_number: context.issue.number,
    bug_type: parsed_body[1],
    categories: parsed_body[2],
    description: parsed_body[3],
    workaround: parsed_body[4],
    code: parsed_body[5]
  }

  const branchName = `issue-${context.issue.number}`;
  const baseBranch = 'master';
  const prTitle = issue.title;
  const fileName = `deleteme-${context.issue.number}.jai`;
  const fileContent = Buffer.from(parsed_body[5]).toString('base64');

  const prBody = format(pull_request_template, params);

  // Create a new branch from the base branch
  const { data: { commit } } = await github.rest.repos.getBranch({
    ...context.repo,
    branch: baseBranch
  });

  await github.rest.git.createRef({
    ...context.repo,
    ref: `refs/heads/${branchName}`,
    sha: commit.sha
  });

  await github.rest.repos.createOrUpdateFileContents({
    ...context.repo,
    path: fileName,
    message: 'Add test',
    content: fileContent,
    branch: branchName
  });

  // Create a pull request
  const { data: pr } = await github.rest.pulls.create({
    ...context.repo,
    title: prTitle,
    head: branchName,
    base: baseBranch,
    body: prBody
  });

  // get current jai version
  const { createCurrentVersionLabel } = require('./create_label.js');
  const jai_version = await createCurrentVersionLabel({github, context});

  // Add labels
  await github.rest.issues.addLabels({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    labels: [ jai_version ]
  });

}

module.exports = createPr;