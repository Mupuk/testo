
// Also update issue_template and pull_request_template to include the following:
const whitelistedLabels = ['insert', 'leak'];

// @todo test what happens when user SB Pr edits the issue. Error for permission? if not allo maintainer to edit?

// Apart from the labels and the correct checkout, should not have to care about any security.
// This workflow is only supposed to convert the issue into a PR and forward edits to the PR
// to the PR branch.
const convertSBIssueToPRAndSynchronize = async ({ github, context, exec }) => {
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
    console.log("This PR is from a forked repository.");
    isForked = true;
  } else {
    console.log("This PR is from the same repository.");
  }


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

  const code = issuePRData.body.match(/^### Short Code Snippet\n[\S\s]*?```c\n(?<code>[\S\s]*?)```/mi).groups.code;
  if (!code) {
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





  


  // // Delete old file if it exists, create new file, commit if it changed
  // // We use this verbose api to avoid 2 separate commits
  // {
  //   // Check if the branch exists or create it
  //   let branchSha = null;
  //   try {
  //     const branchRef = await github.rest.git.getRef({
  //       ...context.repo,
  //       ref: `heads/${branchName}`,
  //     });
  //     branchSha = branchRef.data.object.sha

  //     console.log(`Branch '${branchName}' already exists.`);
  //   } catch (error) {
  //     if (error.status === 404) {
  //       // Branch does not exist, create it
  //       console.log(`Branch '${branchName}' does not exist. Creating it...`);

  //       // Get the default branch (e.g., main) as the base
  //       const { data: defaultBranch } = await github.rest.repos.get({
  //         ...context.repo,
  //       });
  //       const baseBranch = defaultBranch.default_branch;

  //       // Get the SHA of the default branch
  //       const baseBranchRef = await github.rest.git.getRef({
  //         ...context.repo,
  //         ref: `heads/${baseBranch}`,
  //       });

  //       // Create the new branch
  //       const createRefResponse = await github.rest.git.createRef({
  //         ...context.repo,
  //         ref: `refs/heads/${branchName}`,
  //         sha: baseBranchRef.data.object.sha,
  //       });
  //       branchSha = createRefResponse.data.object.sha

  //       // Retrieve the reference of the newly created branch
  //       const branchRef = await github.rest.git.getRef({
  //         ...context.repo,
  //         ref: `heads/${branchName}`,
  //       });
  //       if (branchRef.data.object.sha !== branchSha) { // @todo remove
  //         throw new Error(`Failed to create branch '${branchName}'.`);
  //       }

  //       console.log(`Branch '${branchName}' successfully created.`);
  //     } else {
  //       throw error;
  //     }
  //   }

  //   // Get the current commit and tree
  //   const branchCommit = await github.rest.git.getCommit({
  //     ...context.repo,
  //     commit_sha: branchSha,
  //   });

  //   const currentTreeSha = branchCommit.data.tree.sha;

  //   // Prepare the new tree entries
  //   const tree = await github.rest.git.getTree({
  //     ...context.repo,
  //     tree_sha: currentTreeSha,
  //     recursive: true,
  //   });

    

  //   // Create the new blob
  //   const blob = await github.rest.git.createBlob({
  //     ...context.repo,
  //     content: newFileContent,
  //     encoding: 'base64',
  //   });

  //   // This code does not prevent the user from having more files with different names in the PR
  //   // But this will be caught by the validation later on
  //   const validBugNameRegexTemplate = `^compiler_bugs/(?:${context.issue.number}|0)_\\d+_[CR]EC-?\\d+\\.jai$`; // @copyPasta
  //   const validBugNameRegex = new RegExp(validBugNameRegexTemplate);
  //   let replacedFile = false;
  //   const newTree = tree.data.tree
  //     // The bug type or error code may have changed, so we need to delete the old one
  //     .map(file => {
  //       if (validBugNameRegex.test(file.path)) {
  //         console.log('Changing Content of file:', file.path);
  //         if (replacedFile) {
  //           throw new Error('Expected exactly 1 file in a SB PR');
  //         } else {
  //           replacedFile = true;
  //         }
  //         return {
  //           path: file.path,
  //           mode: file.mode,
  //           type: file.type,
  //           sha: blob.data.sha, // Replace the file content
  //         };
  //       }
  //       return file;
  //     });


  //   if (!replacedFile) {
  //     console.log('Adding file:', filePath);
  //     newTree.push({
  //       path: filePath,
  //       mode: '100644', // https://docs.github.com/en/rest/git/trees?apiVersion=2022-11-28
  //       type: 'blob',
  //       sha: blob.data.sha,
  //     });
  //   }

  //   // Create the new tree
  //   const newTreeResponse = await github.rest.git.createTree({
  //     ...context.repo,
  //     tree: newTree,
  //     base_tree: currentTreeSha,
  //   });

  //   // Check if the new tree is identical to the current tree
  //   if (newTreeResponse.data.sha !== tree.data.sha) {
  //     // Create a new commit
  //     const newCommit = await github.rest.git.createCommit({
  //       ...context.repo,
  //       message: `[CI] Issue was updated, updating PR branch`,
  //       tree: newTreeResponse.data.sha,
  //       parents: [branchSha],
  //     });

  //     // Update the branch to point to the new commit
  //     await github.rest.git.updateRef({
  //       ...context.repo,
  //       ref: `heads/${branchName}`,
  //       sha: newCommit.data.sha,
  //       // force: true,         // Fail if a new update happened, and restart this workflow
  //     });

  //     console.log(`Branch '${branchName}' updated with new commit.`);
  //   } else {
  //     console.log('No changes detected. Skipping commit.');
  //   }
  // }



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
