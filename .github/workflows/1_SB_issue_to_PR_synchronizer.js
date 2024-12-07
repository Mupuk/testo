
// Also update issue_template and pull_request_template to include the following:
const whitelistedLabels = ['insert', 'leak'];


// Apart from the labels and the correct checkout, we should not have to care about any security.
// This workflow is only supposed to convert the issue into a PR and forward edits to the PR
// to the PR branch. The only thing it enforces is the PR body and that its only one file in the PR.
// If its a fork we dont update anything, since the PR could be badly formatted, and it could happen,
// that we dont have write access to the forked repository. 
const convertSBIssueToPRAndSynchronize = async ({ github, context }) => {
  const eventType = context.eventName; // 'issues' or 'pull_request'
  console.log('eventType', eventType);
  const isIssue = eventType === 'issues';
  const issuePRData = isIssue ? context.payload.issue : context.payload.pull_request;
  issuePRData.body = issuePRData.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  console.log('issuePRData', JSON.stringify(issuePRData, null, 2));

  const state = issuePRData.state;
  console.log('state', state);

  if (state !== 'open') {
    console.log('Issue/PR is not open ... skipping');
    return;
  }


  // Make sure its a SB
  const isSB = /^\[SB\]:/.test(issuePRData.title);
  if (!isSB) {
    console.log('Issue is not a SB ... skipping');
    return;
  }

  let isForked = false;
  if (!isIssue && issuePRData.head.repo.fork) {
    isForked = true;
  }
  console.log('isForked', isForked);


  // Get issue, since its a converted issue, we need to get the original issue
  // to get the originial issue creator
  const { data: originalIssue } = await github.rest.issues.get({
    ...context.repo,
    issue_number: context.issue.number,
  });
  originalIssue.body = originalIssue.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const originialIssueCreator = isIssue ? issuePRData.user.login : originalIssue.user.login;
  console.log('originialIssueCreator', originialIssueCreator);



  // A few variables we need for the PR
  const branchName = `issue-${context.issue.number}`;
  const baseBranch = context.payload.repository.default_branch;

  const bug_type = issuePRData.body.match(/^### Bug Type\n\n(?<type>(?:Compiletime)|(?:Runtime))/mi)?.groups.type
  if (!bug_type) {
    throw new Error('Bug Type not found. Most likely the issue was not formatted correctly after editing.');
  }
  const bug_type_letter = bug_type[0].toUpperCase(); // C or R

  const expected_error_code = issuePRData.body.match(/^### Expected Error Code\n\n(?<errorCode>-?\d+)/mi)?.groups.errorCode
  if (!expected_error_code) {
    throw new Error('Expected Error Code not found. Most likely the issue was not formatted correctly after editing.');
  }

  const categories = issuePRData.body.match(/^### Categories\n(?<categories>[\S\s]*?)###/mi)?.groups.categories.trim();
  if (!categories) {
    throw new Error('Categories not found. Most likely the issue was not formatted correctly after editing.');
  }

  let code = issuePRData.body.match(/^### Short Code Snippet\n[\S\s]*?```c\n(?<code>[\S\s]*?)```/mi)?.groups.code;
  if (!isForked && !code) { // Dont need it on a fork
    throw new Error('Code Snippet not found. Most likely the issue was not formatted correctly after editing.');
  }
  code = code.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  console.log('parsed code', code);



  // 'new' will be replaced with the tracker id later on
  const fileName = `0_${context.issue.number}_${bug_type_letter}EC${Number.parseInt(expected_error_code)}`; 
  let filePath = `compiler_bugs/${fileName}.jai`;
  let oldFile = null;




  // We dont care about any race conditions, as the commit will fail if the branch is not up to date
  // Also since we just update the file content and have the actual validation happen later,
  // we can use this api.

  // Convert issue to a pull request if it isn't already
  if (isIssue) {
    if (isForked) {
      throw new Error('Fork cant be an Issue');
    }
    console.log('Creating Branch', branchName);
    try {
      // Check if the branch already exists
      branchRef = await github.rest.git.getRef({
        ...context.repo,
        ref: `heads/${branchName}`,
      });
    } catch (error) {
      if (error.status === 404) {
        const { data: baseBranchData } = await github.rest.repos.getBranch({
          owner: context.repo.owner,
          repo: context.repo.repo,
          branch: 'master',
        });

        // Create a new branch for the PR
        await github.rest.git.createRef({
          ...context.repo,
          ref: `refs/heads/${branchName}`,
          sha: baseBranchData.commit.sha,
        });
      }
    }


  } else { 
    // Find old file to update
    const { data } = await github.rest.pulls.listFiles({
      ...context.repo,
      pull_number: context.issue.number,
      per_page: 100
    });
    console.log('data', data);
    if (data.length !== 1) {
      throw new Error('Expected exactly 1 file in a SB PR');
    }
    filePath = data.map(file => file.filename)[0];
    console.log('found filePathToChange', filePath);

    // Get the current content of the matched file
    const fileContent = await github.rest.repos.getContent({
      ...context.repo,
      path: filePath,
      ref: branchName
    });
    oldFile = fileContent;
    oldFile.data.content = Buffer.from(oldFile.data.content, 'base64')
                            .toString('utf-8').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  }


  // Update the file in the PR branch if it changed. Never update forkes
  if (!isForked && oldFile?.data.content !== code) {
    console.log('Updating file:', filePath);
    await github.rest.repos.createOrUpdateFileContents({
      ...context.repo,
      branch: branchName,
      path: filePath,
      message: `[CI] Synchronizing issue content to PR branch`,
      content: Buffer.from(code).toString('base64'),
      ...(oldFile? { sha: oldFile.data.sha } : {}),
    });
  } else {
    console.log('No changes detected. Skipping file update.');
  }


  // Convert issue to PR if it isn't already
  if (isIssue) {
    console.log('Converting Issue to PR');
    const { data: prData } = await github.rest.pulls.create({
      ...context.repo,
      head: branchName,
      base: baseBranch,
      body: issuePRData.body,
      issue: context.issue.number
    });

    // Add the issue owner as an assignee to the PR
    await github.rest.issues.addAssignees({
      ...context.repo,
      issue_number: prData.number,
      assignees: [originialIssueCreator],
    });

    await github.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      body: `👋 Thanks for the contribution @${originialIssueCreator}! If you need to do modifications, you can do so, as long as the PR is not merged yet!`,
    });
  } else {
    console.log('Issue was already converted to PR');
  }



  // Always update the PR labels
  const categoryLabels = categories.split(',')
                            .map((label) => label.trim())
                            .filter((label) => whitelistedLabels.includes(label));
  console.log('categoryLabels', categoryLabels);

  const existingLabelsResponse = await github.rest.issues.listLabelsOnIssue({
    ...context.repo,
    issue_number: context.issue.number,
  });

  const existingLabelsToRetain = existingLabelsResponse.data
                                  .map((label) => label.name)
                                  .filter((label) => !whitelistedLabels.includes(label)); // remove categories
  console.log('existingLabelsToRetain', existingLabelsToRetain);

  // Add labels to PR
  await github.rest.issues.setLabels({
    ...context.repo,
    issue_number: context.issue.number,
    labels: [...existingLabelsToRetain, ...categoryLabels],
  });

};

module.exports = convertSBIssueToPRAndSynchronize;
