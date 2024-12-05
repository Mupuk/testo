
const convertSBIssueToPR = async ({ github, context, exec }) => {


  console.log(context.payload.issue.state);
  // Check if issue is already closed
  if (context.payload.issue.state === 'closed') {
    console.log('Issue is already closed ... skipping');
    return;
  }

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

  // const parsedBody = parseIssueBody(issue.body);
  // console.log(JSON.stringify(parsedBody, null, 2));



  const branchName = `issue-${context.issue.number}`;
  const baseBranch = context.payload.repository.default_branch;

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
  const newFileContent = Buffer.from(code).toString('base64');

  const prBody = issue.body;





  // Because of untrusted code, we will have to update and create the 
  // branch via the API. The alternative is to also validate the PR branch

  // Step 1: Check if the branch exists
  let branchRef = null;
  try {
    branchRef = await github.rest.git.getRef({
      ...context.repo,
      ref: `heads/${branchName}`,
    });

    console.log(`Branch '${branchName}' already exists.`);
  } catch (error) {
    if (error.status === 404) {
      // Create a new branch and PR

      // Branch does not exist, create it
      console.log(`Branch '${branchName}' does not exist. Creating it...`);

      // Get the default branch (e.g., main) as the base
      const { data: defaultBranch } = await github.rest.repos.get({
        ...context.repo,
      });
      const baseBranch = defaultBranch.default_branch;

      // Get the SHA of the default branch
      const baseBranchRef = await github.rest.git.getRef({
        ...context.repo,
        ref: `heads/${baseBranch}`,
      });

      // Create the new branch
      await github.rest.git.createRef({
        ...context.repo,
        ref: `refs/heads/${branchName}`,
        sha: baseBranchRef.data.object.sha,
      });

      // Retrieve the reference of the newly created branch
      branchRef = await github.rest.git.getRef({
        ...context.repo,
        ref: `heads/${branchName}`,
      });

      console.log(`Branch '${branchName}' successfully created.`);
    } else {
      throw error;
    }
  }


  const branchSha = branchRef.data.object.sha;

  // Step 3: Get the current commit and tree
  const branchCommit = await github.rest.git.getCommit({
    ...context.repo,
    commit_sha: branchSha,
  });

  const currentTreeSha = branchCommit.data.tree.sha;

  // Step 4: Prepare the new tree entries
  const tree = await github.rest.git.getTree({
    ...context.repo,
    tree_sha: currentTreeSha,
    recursive: true,
  });

  const newTree = tree.data.tree
    // The bug type or error code may have changed, so we need to delete the old one
    .map(file => {
      if (file.path.includes(String(context.issue.number))) {
        console.log('Deleting file:', file.path);
        return {
          path: file.path,
          mode: file.mode,
          type: file.type,
          sha: null, // Mark file for deletion
        };
      }
      return {
        path: file.path,
        mode: file.mode,
        type: file.type,
        sha: file.sha,
      };
    });

  // Add new file to the tree
  const blob = await github.rest.git.createBlob({
    ...context.repo,
    content: newFileContent,
    encoding: 'base64',
  });

  newTree.push({
    path: filePath,
    mode: '100644', // https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28
    type: 'blob',
    sha: blob.data.sha,
  });

  // Step 5: Create the new tree
  const newTreeResponse = await github.rest.git.createTree({
    ...context.repo,
    tree: newTree,
    base_tree: currentTreeSha,
  });

  // Check if the new tree is identical to the current tree
  if (newTreeResponse.data.sha !== tree.data.sha) {
    // Step 6: Create a new commit
    const newCommit = await github.rest.git.createCommit({
      ...context.repo,
      message: `[CI] Issue was updated, updating PR branch`,
      tree: newTreeResponse.data.sha,
      parents: [branchSha],
    });

    // Step 7: Update the branch to point to the new commit
    await github.rest.git.updateRef({
      ...context.repo,
      ref: `heads/${branchName}`,
      sha: newCommit.data.sha,
      force: true,
    });

    console.log(`Branch '${branchName}' updated with new commit.`);
  } else {
    console.log('No changes detected. Skipping commit.');
    return; // Exit the workflow or function
  }


  // Get all open PRs for the branch
  const prs = await github.rest.pulls.list({
    ...context.repo,
    head: `${context.repo.owner}:${branchName}`,
    state: 'open',
  });
  
  // Step 8: Create a Pull Request if it doesnt exist yet
  if (prs.data.length === 0) {
    const pr = await github.rest.pulls.create({
    ...context.repo,
      title: '[SB]: ' + fileName,
      body: prBody,
      head: branchName,
      base: context.payload.repository.default_branch,
    });

    console.log(`Created PR: ${pr.data.html_url}`);

    // Link PR to issue
    const issueCreator = context.payload.issue.user.login; // Get the username of the issue creator
    await github.rest.issues.createComment({
      ...context.repo,
      issue_number: context.issue.number,
      body: `👋 Thanks for the contribution @${issueCreator}, please continue further discussion on this matter here: ${pr.html_url}!`,
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


    // Add labels to PR
    // @note we can not allow changes to labels to propagate, since these are controlled
    // by the user. On initial creation, we can, because the template is controlled by us.
    const categories = issue.body.match(/^### Categories\n(?<categories>[\S\s]*?)###/mi)?.groups.categories.trim();
    const categoryLabels = categories.split('\n').map((label) => label.trim());
    console.log('categoryLabels', categoryLabels);

    // Add labels to PR
    await github.rest.issues.addLabels({
      ...context.repo,
      issue_number: pr.number,
      labels: [...categoryLabels],
    });

  } else {
    console.log(`PR already exists for branch '${branchName}'.`);
  }

  // @todo maybe this is better?
  // // Convert issue to a pull request
  // const { data: pr } = await github.rest.pulls.create({
  //   ...context.repo,
  //   // title: fileName,
  //   head: branchName,
  //   base: baseBranch,
  //   // body: prBody,
  //   issue: context.issue.number
  // });









};

module.exports = convertSBIssueToPR;
