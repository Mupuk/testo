
function parseIssueBody(text) {
  const sections = [...text.matchAll(/### (?<title>.*?\n)(?<content>[\S\s]*?)(?=\n###)/g)]
                    .map((match) => match.groups);
  const parsedData = {};

  sections.forEach((section) => {
    // EXAMPLE section: 
    // [Object: null prototype] {
    //   title: 'Bug Description\n',
    //   content: '\n_No response_\n'
    // }
    const heading = section.title.trim();
    const content = section.content.trim();

    if (heading === 'General') {
      // Parse checkboxes
      const checkboxes = content.split('\n')
        .filter((line) => line.trim().length > 0)
        .map((line) => {
          const isChecked = line.toLowerCase().includes('[x]');
          return {
            label: line.replace(/- \[.\]\s*/, '').trim(),
            checked: isChecked,
          };
        });
      parsedData[heading] = checkboxes;
    } else if (heading === 'Short Code Snippet') {
      // Extract text inside ```c``` block
      const codeBlockMatch = content.match(/```c([\s\S]*?)```/);
      parsedData[heading] = codeBlockMatch ? codeBlockMatch[1].trim() : '';
    } else {
      // Parse other sections
      parsedData[heading] = content;
    }
  });

  return parsedData;
}



const convertSBIssueToPR = async ({ github, context, exec }) => {
  const { format } = require('./_utils.js');

  // Get issue
  const { data: issue } = await github.rest.issues.get({
    ...context.repo,
    issue_number: context.issue.number,
  });
  issue.body = issue.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Check that its a SB
  const isSB = /^### \[SB\]:/.test(issue.body);
  if (!isSB) {
    console.log('Issue is not a SB ... skipping');
    return;
  }

  const parsedBody = parseIssueBody(issue.body);
  console.log(JSON.stringify(parsedBody, null, 2));



  // Create PR
  const branchName = `issue-${context.issue.number}`;
  const baseBranch = 'master';
  // const prTitle = /\[SB\]:/.test(issue.title) ? issue.title : `[SB]: ${issue.title}`;

  const bug_type = issue.body.match(/^### Bug Type\n\n(?<type>(?:Compiletime)|(?:Runtime))/mi)?.groups.type
  if (!bug_type) {
    throw new Error('Bug Type not found. Most likely the issue was not formatted correctly after editing.');
  }
  const bug_type_letter = bug_type[0].toUpperCase(); // C or R

  const expected_error_code = issue.body.match(/^### Expected Error Code\n\n(?<errorCode>-?\d+)/mi)?.groups.errorCode
  if (!expected_error_code) {
    throw new Error('Expected Error Code not found. Most likely the issue was not formatted correctly after editing.');
  }

  const fileName = `${bug_type_letter}EC${Number.parseInt(expected_error_code,)}_${context.issue.number}`;
  const filePath = `compiler_bugs/${fileName}.jai`;

  const code = issue.body.match(/^### Short Code Snippet\n[\S\s]*?```c\n(?<code>[\S\s]*?)```/mi).groups.code;
  console.log('parsed code', code);
  const fileContent = Buffer.from(code).toString('base64');

  const prBody = issue.body;

  // Create a new branch from the base branch
  const {
    data: { commit },
  } = await github.rest.repos.getBranch({
    ...context.repo,
    branch: baseBranch,
  });

  await github.rest.git.createRef({
    ...context.repo,
    ref: `refs/heads/${branchName}`,
    sha: commit.sha,
  });

  // Create a new file in the new branch
  await github.rest.repos.createOrUpdateFileContents({
    ...context.repo,
    path: filePath,
    message: 'Add test',
    content: fileContent,
    branch: branchName,
  });

  // not sure if we should convert it to PR or create new PR
  // Create a pull request
  const { data: pr } = await github.rest.pulls.create({
    ...context.repo,
    title: fileName,
    head: branchName,
    base: baseBranch,
    body: prBody,
  });

  // // Convert issue to a pull request
  // const { data: pr } = await github.rest.pulls.create({
  //   ...context.repo,
  //   // title: fileName,
  //   head: branchName,
  //   base: baseBranch,
  //   // body: prBody,
  //   issue: context.issue.number
  // });

  // Link PR to issue
  await github.rest.issues.createComment({
    ...context.repo,
    issue_number: context.issue.number,
    body: `👋 Thanks for the contribution, please continue further discussion on this matter here: ${pr.html_url}!`,
  });

  // Not sure if we should close or lock the original issue
  // await github.rest.issues.lock({
  //   ...context.repo,
  //   issue_number: context.issue.number,
  // });

  // await github.rest.issues.update({
  //   ...context.repo,
  //   issue_number: context.issue.number,
  //   state: 'closed',
  //   state_reason: 'completed'
  // })

  // Create Labels if they dont exist
  // const { createLabels } = require('./_create_label.js');
  // const categoryLabels = params.categories.split(', ');
  // await createLabels({ github, context, labelNames: categoryLabels });
  const categories = issue.body.match(/^### Categories\n(?<categories>[\S\s]*?)###/mi)?.groups.categories.trim();
  const categoryLabels = categories.split('\n').map((label) => label.trim());
  console.log('categoryLabels', categoryLabels);

  // Add labels to PR
  await github.rest.issues.addLabels({
    ...context.repo,
    issue_number: pr.number,
    labels: [...categoryLabels],
  });
};

module.exports = convertSBIssueToPR;
