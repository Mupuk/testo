const pullRequestTemplate = `
### General

- [x] I've looked for similar bugs
- [x] This bug fits into a single file
- [{already_reported}] I've already reported the bug to Jon

### Related Issues
Closes: #{issue_number}

### Expected Error Code
#### What error code is expected to pass the test?
- {expected_error_code}

### Categorization
#### What category does this bug belong to the most / What feature triggered the bug? Delete the others.
- {categories}

### Bug Description
#### Please fill this out if it is a more complicated bug.

{description}

### Workaround
#### If you have a workaround, please share it here.

{workaround}

### Short Code Snippet
#### Please put your code to reproduce the bug here. Only use it if it is a short bug(one file).

\`\`\`c
{code}
\`\`\`
`;

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

const createPRFromSBIssue = async ({github, context, exec}) => {
  const { format } = require('./utils.js');

  // Get issue
  const { data: issue } = await github.rest.issues.get({
    ...context.repo,
    issue_number: context.issue.number
  });

  // Check that its a SB
  const isSB = /^\[SB\]:/.test(issue.title);
  if (!isSB) return;

  const parsedBody = parseIssueBody(issue.body);

  const params = {
    already_reported: parsedBody?.[0]?.[2]?.checked ? 'X' : ' ',
    issue_number: context.issue.number,
    expected_error_code: parsedBody[1],
    categories: parsedBody[2],
    description: parsedBody[3],
    workaround: parsedBody[4],
    code: parsedBody[5]
  }

  const branchName = `issue-${context.issue.number}`;
  const baseBranch = 'master';
  const prTitle = issue.title;
  const fileName = `compiler_bugs/EC${Number.parseInt(params.expected_error_code)}_${context.issue.number}.jai`;
  const fileContent = Buffer.from(parsedBody[5]).toString('base64');

  const prBody = format(pullRequestTemplate, params);

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

  
  // not sure if we should convert it to PR or create new PR
  // Create a pull request
  const { data: pr } = await github.rest.pulls.create({
    ...context.repo,
    title: prTitle,
    head: branchName,
    base: baseBranch,
    body: prBody,
  });

  // // Convert issue to a pull request
  // const { data: pr } = await github.rest.pulls.create({
  //   ...context.repo,
  //   // title: prTitle,
  //   head: branchName,
  //   base: baseBranch,
  //   // body: prBody,
  //   issue: context.issue.number
  // });


  // Link PR to issue
  await github.rest.issues.createComment({
    ...context.repo,
    issue_number: context.issue.number,
    body: `👋 Thanks for the contribution, please continue further discussion on this matter here: ${pr.html_url}!`
  })

  // Not sure if we should close or lock the original issue
  // @todo uncomment after testing
  // await github.rest.issues.lock({
  //   ...context.repo,
  //   issue_number: context.issue.number,
  // })

  // await github.rest.issues.update({
  //   ...context.repo,
  //   issue_number: context.issue.number,
  //   state: 'closed',
  //   state_reason: 'completed'
  // })

  
  // Create Labels if they dont exist
  const { createLabels } = require('./create_label.js');
  const categoryLabels = params.categories.split(', ');
  await createLabels({github, context, labelNames: categoryLabels});

  // // Add labels to issue
  // await github.rest.issues.addLabels({
  //   ...context.repo,
  //   issue_number: context.issue.number,
  //   labels: [ jaiVersion,  ...categoryLabels ]
  // });

  // Add labels to PR
  await github.rest.issues.addLabels({
    ...context.repo,
    issue_number: pr.number,
    labels: [ ...categoryLabels ]
  });

  return pr.number;
}

module.exports = createPRFromSBIssue;