const { makeExtendedRegExp } = require('./_utils.js');

// Make sure the regex capture groups stay the same :regexGroupNames
// When a new platform is added update :platformSpecific
const parseIssueHeaderRegex = makeExtendedRegExp(String.raw`
  (?<=\| :-.*$\s)          # Match and skip table data splitter | :-: | :-: | :-: | :-: | + newline

  # Match and capture the table data
  \| (?<emailedIn>.*?) \| (?<reportedVersion>.*?) \| (?<latestBrokenVersion>.*?) \| (?<latestBrokenPlatforms>.*?) \| (?<fixVersion>.*?) \| 
`,
'm' // Flags
);

const parseIssueHistoryRegex =  makeExtendedRegExp(String.raw`
  (?<=History$\s(?:.*$\s){2,})              # Match and skip the history header + skip to data
  \| (?<version>.*?) \| (?<windows>.*?) \| (?<linux>.*?) \| (?<mac>.*?) \|        # Match row data
`,
'mig' // Flags
);


const handleNewTests = ({ newTestResults, newTestIssueNumbers, platform, currentJaiVersion, github, context}) => {


  //   // In theorie there could already exist a history from other platforms
  //   const { data: issue } = await github.rest.issues.get({
  //     ...context.repo,
  //     issue_number: issueId,
  //   });
  //   issue.body = issue.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  //   let newCommentBody = issue.body;
  //   let newLabels = issue.labels.map((label) => label.name);

  //   newCommentBody = newCommentBody.replace(
  //     parseIssueHeaderStatusRegex,
  //     (
  //       match,
  //       emailedIn,
  //       lastBrokenPlatforms,
  //       lastEncounteredVersion,
  //       fixVersion,
  //     ) => {
  //       lastBrokenPlatforms = platform;
  //       // Since its a new bug, we know the latest version is broken so we use it here
  //       lastEncounteredVersion = currentJaiVersion;
  //       return `| ${emailedIn} | ${lastBrokenPlatforms} | ${lastEncounteredVersion} | ${fixVersion} |`;
  //     },
  //   );

  //   // since its a new issue, the history should be empty, all platforms in the matrix only get the original state and it will be udpated after all of them ran
  //   // if (parseIssueHistoryRegex.test(newCommentBody)) {
  //   //   console.error('History already exists in issue:', issueId);
  //   //   //process.exit(1); // Should never happen
  //   //   continue;
  //   // }

  //   // Go over all versions of the test run and change the history accordingly
  //   oldToNewCompilerVersions.forEach((version, index) => {
  //     const currentTestResultOfVersion =
  //       newTestResultsByVersion[version].results[currentTest.file];
  //     const currentPassedTest = currentTestResultOfVersion.passed_test
  //       ? '✅'
  //       : '❌';
  //     const currentErrorCode = currentTestResultOfVersion.did_run
  //       ? currentTestResultOfVersion.run_exit_code
  //       : currentTestResultOfVersion.compilation_exit_code;
  //     const currentExpectedErrorCode =
  //       currentTestResultOfVersion.expected_error_code;

  //     if (currentTestResultOfVersion.passed_test === false) {
  //       newLabels.push(version, platform);
  //     }

  //     if (index === 0 && !parseIssueHistoryRegex.test(newCommentBody)) {
  //       // only if its first entry and no history exists
  //       // Just append since the history is still empty
  //       newCommentBody =
  //         newCommentBody.trimEnd() +
  //         `\n| ${currentPassedTest} | ${platform} | ${currentDate} | ${version} | ${currentErrorCode} - Expected ${currentExpectedErrorCode} |`;
  //     } else {
  //       // Update history via regex, only works if at least one is there
  //       let replaceIndex = 0;
  //       newCommentBody = newCommentBody.replace(
  //         parseIssueHistoryRegex,
  //         (
  //           match,
  //           passedTest,
  //           platforms,
  //           date,
  //           oldVersion,
  //           errorCode,
  //           expectedErrorCode,
  //         ) => {
  //           /////////////////////////////////////////////
  //           // Add New Row
  //           let newFirstRow = '';
  //           const testResultOfPreviousVersion =
  //             newTestResultsByVersion[oldToNewCompilerVersions[index - 1]]
  //               ?.results[currentTest.file];
  //           // index === 0 means there is already a history, but only of other platforms, so we need to add all the results of this platform
  //           const addNewEntry =
  //             index === 0 ||
  //             currentTestResultOfVersion.passed_test === false ||
  //             (currentTestResultOfVersion.passed_test === true &&
  //               testResultOfPreviousVersion.passed_test === false);
  //           if (replaceIndex === 0 && addNewEntry) {
  //             replaceIndex++; // increment counter
  //             newFirstRow = `| ${currentPassedTest} | ${platform} | ${currentDate} | ${version} | ${currentErrorCode} - Expected ${currentExpectedErrorCode} |\n`;
  //           }

  //           /////////////////////////////////////////////
  //           // Overwrite Old Row
  //           replaceIndex++; // increment counter
  //           let oldRow = `| ${passedTest} | ${platforms} | ${date} | ${oldVersion} | ${errorCode} - Expected ${expectedErrorCode} |`;
  //           return `${newFirstRow}${oldRow}`;
  //         },
  //       );
  //     }
  //   });





  //   const issueEntry = {};
  //   issueEntry.issueId = issueId;
  //   issueEntry.newLabels = [...new Set(newLabels)]; // remove duplicates
  //   issueEntry.newCommentBody = newCommentBody;
  //   testSuitOutput.issues ||= [];
  //   testSuitOutput.issues.push(issueEntry);
  //   // await createLabels({github, context, labelNames: newLabels});

  //   // // @todo instead up update here, pass result to updater
  //   // // Update comment
  //   // await github.rest.issues.update({
  //   //   ...context.repo,
  //   //   issue_number: issueId,
  //   //   body: newCommentBody,
  //   //   labels: newLabels
  //   // });
  // }
};

const runTestSuitAndGatherOutput = async ({ github, context, exec, io }) => {
  const path = require('path');
  const fs = require('fs');
  const { getCurrentJaiVersion, decrementVersionString } = require('./_utils.js');

  const platform = process.env.RUNNER_OS.toLowerCase();
  console.log(`Running on platform: ${platform}`);

  const currentJaiVersion = await getCurrentJaiVersion({ exec });


  // Get old state of test results
  // FORMAT: 
  // {
  //   "263": { // issue id
  //     "beta-0.1.096": {
  //       "windows": {
  //         "compilation_exit_code": 0,
  //         "expected_compilation_exit_code": 0,
  //         "expected_run_exit_code": 0,
  //         "is_runtime_test": false,
  //         "passed_test": true,
  //         "run_exit_code": -1
  //       },
  //       "linux": {
  //         ...
  //       }
  //     },
  //     "file_path": "compiler_bugs/CEC0_263.jai",
  //     "issue_number": 263
  //   },
  //   ...
  // }
  let oldTestResults = {};
  try {
    const data = fs.readFileSync('old_test_results.json', 'utf8');
    oldTestResults = JSON.parse(data);
  } catch (err) {
    console.error('Error reading file:', err);
  }

  const options = { silent: false };
  let compilerPath = await io.which('jai'); // we start with the current one
  try {
    // Get the real path, if its a symlink
    compilerPath = fs.readlinkSync(compilerPath);
  } catch (err) {} // ignore error
  console.log('Running for version:', currentJaiVersion);
  console.log('compilerPath', compilerPath);
  
  // Run test suit 
  await exec.exec(`${compilerPath} bug_suit.jai`, [], options);



  // Get new test results
  // NOTE: this data could get extended in the handling code of new tests, to 
  //       add more results of older compiler versions!
  let newTestResults = {};
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    newTestResults = JSON.parse(data);
  } catch (err) {
    console.error('Error reading file:', err);
  }


  const oldTestIssueNumbers = Object.keys(oldTestResults);
  const newTestIssueNumbers = Object.keys(newTestResults);

  // Find all tests that were added. We need this to gather extra results
  const newIssueNumbers = newTestIssueNumbers.filter(
    (item) => !oldTestIssueNumbers.includes(item),
  );
  console.log('newIssueNumbers', JSON.stringify(newIssueNumbers, null, 2));

  // Run the test suit for all older compiler versions for each new test
  for (const currentIssueNumber of newIssueNumbers) {
    console.log('handle newTest', JSON.stringify(newTestResults[currentIssueNumber], null, 2));

    // Run older compiler versions for this test
    let suffix = '';
    if (platform === 'linux') suffix = '-linux';
    if (platform === 'macos') suffix = '-macos';
    let tempVersion = currentJaiVersion;
    const filePath = newTestResults[currentIssueNumber].file_path;

    while (true) {
      const extension = path.extname(compilerPath);
      tempVersion = decrementVersionString(tempVersion);
      const newCompilerPath =
      path.resolve(compilerPath, '..', '..', '..', `jai-${tempVersion}/bin`)
      + `${path.sep}jai${suffix}${extension}`;
      
      if (!fs.existsSync(newCompilerPath))  break;
      console.log('Running for version:', tempVersion);
      console.log('newCompilerPath', newCompilerPath);
      await exec.exec(`${newCompilerPath} bug_suit.jai - ${filePath}`, [], options);
    }
  }
  
  if (newIssueNumbers.length > 0) {
    try {
      const data = fs.readFileSync('test_results.json', 'utf8');
      newTestResults = JSON.parse(data);
    } catch (err) {
      console.error('Error reading file:', err);
    }
  }
  console.log('newTestResults', JSON.stringify(newTestResults, null, 2));

  // // Find all tests that were removed
  // const removedIssueNumbers = oldTestIssueNumbers.filter(
  //   (item) => !newTestIssueNumbers.includes(item),
  // );

  // // All issues that existed both in old and new test results
  // const commonIssueNumbers = oldTestIssueNumbers.filter(
  //   (item) => newTestIssueNumbers.includes(item),
  // );
  //
  // // @todo move this to updategithub function
  // // Find all tests that had a new result in the new test results
  // const changedIssueNumbers = commonIssueNumbers.filter(
  //   (issueNumber) => {
  //     // Only compare latest version
  //     const oldResults = oldTestResults[issueNumber][currentJaiVersion];
  //     const newResults = newTestResults[issueNumber][currentJaiVersion];
  //     return !isDeepEqual(oldResults, newResults);
  //   },
  // );



  
  // let suffix = '';
  // if (platform === 'linux') suffix = '-linux';
  // if (platform === 'macos') suffix = '-macos';
  // let tempVersion = currentJaiVersion;
  
  // const extension = path.extname(compilerPath);
  // tempVersion = decrementVersionString(tempVersion);
  // console.log('Running for version:', tempVersion);
  // compilerPath =
  //   path.resolve(compilerPath, '..', '..', '..', `jai-${tempVersion}/bin`)
  //     + `${path.sep}jai${suffix}${extension}`;
  // console.log('compilerPath', compilerPath);
  // await exec.exec(`${compilerPath} bug_suit.jai`, [], options);


  // // make test results available via version, and results via name
  // const oldTestResultsByVersion =
  //   lastTestResults[platform]?.reduce((acc, item) => {
  //     acc[item.version] = item;
  //     // also reduce the results
  //     acc[item.version].results = item.results.reduce((acc, item) => {
  //       acc[item.file] = item;
  //       return acc;
  //     }, {});

  //     return acc;
  //   }, {}) || [];

  // const newTestResultsByVersion =
  //   newTestResults[platform]?.reduce((acc, item) => {
  //     acc[item.version] = item;
  //     // also reduce the results
  //     acc[item.version].results = item.results.reduce((acc, item) => {
  //       acc[item.file] = item;
  //       return acc;
  //     }, {});

  //     return acc;
  //   }, {}) || [];

  // // console.log('new test res', newTestResults);
  // // console.log('newTestResultsByVersion', newTestResultsByVersion);

  // const previousVersion = decrementVersionString(currentJaiVersion, 1);
  // console.log(previousVersion);
  // // console.log('old', oldTestResultsByVersion[previousVersion]);
  // // console.log('new', newTestResultsByVersion[previousVersion]);

  // // We need to find all tests that are new. We compare the old and new log. We have to update their issues.
  // //
  // //
  // //           Old Log       New Log
  // //              -          0.1.094
  // //           0.1.093  <>   0.1.093 // This version exists in both logs, compare them
  // //           0.1.092       0.1.092
  // //           0.1.091          -
  // //
  // const newTests = Object.values(
  //   newTestResultsByVersion[previousVersion].results,
  // ).filter(
  //   (obj1) =>
  //     !oldTestResultsByVersion[previousVersion] || // if the previous version does not exist in old log, then all tests are new
  //     !Object.values(oldTestResultsByVersion[previousVersion].results).some(
  //       (obj2) => obj1.file === obj2.file,
  //     ), // if the file does not exist in old log
  // );

  // console.log('newTests\n', newTests);

  // // We need to update all issues where the status has changed. We compare the old and new log.
  // //
  // //           Old Log       New Log
  // //              -          0.1.094
  // //                            ^--
  // //                               |- compare those to versions, to see if the updated changed the test result
  // //                            v--
  // //           0.1.093       0.1.093
  // //           0.1.092       0.1.092
  // //           0.1.091          -
  // //
  // const changedTests = Object.values(
  //   newTestResultsByVersion[currentJaiVersion].results,
  // ).filter(
  //   (obj1) =>
  //     obj1.file in newTestResultsByVersion[previousVersion].results && // if the file exists in previous version, this should be redundant?
  //     !isDeepEqual(
  //       obj1,
  //       newTestResultsByVersion[previousVersion].results[obj1.file],
  //     ) && // if the test results are different
  //     !newTests.some((test) => test.file === obj1.file), // if the test is not new
  // );
  // console.log('changedTests\n', changedTests);

  // // We need to find all tests that are removed to close their issues.
  // //
  // //           Old Log       New Log
  // //              -          0.1.094
  // //           0.1.093  <>   0.1.093 // This version exists in both logs, compare them
  // //           0.1.092       0.1.092
  // //           0.1.091          -
  // //
  // const removedTests = Object.values(
  //   oldTestResultsByVersion[previousVersion]?.results || [],
  // ).filter(
  //   (obj1) =>
  //     !newTestResultsByVersion[previousVersion] || // if the previous version does not exist in new log, then all tests are removed
  //     !Object.values(newTestResultsByVersion[previousVersion].results).some(
  //       (obj2) => obj1.file === obj2.file,
  //     ), // if the file does not exist in new log
  // );
  // console.log('removedTests\n', removedTests);

  // const oldToNewCompilerVersions = newTestResults[platform]
  //   .map((item) => item.version)
  //   .sort();
  // const currentDate = new Date().toISOString().split('T')[0];

  // Handle all new Tests
  // handleNewTests({ newTestResults, newTestIssueNumbers, platform, currentJaiVersion, github, context});



  // Handle all changed Tests
  // for (const currentIssueNumber of changedIssueNumbers) {



    // const issueId =
    //   Number.parseInt(currentTest.file.match(/\d+(?=[./])/)?.[0]) || -1;
    // if (issueId === -1) {
    //   console.error('Issue ID not found in file name:', currentTest);
    //   continue;
    // }

    // const { data: issue } = await github.rest.issues.get({
    //   ...context.repo,
    //   issue_number: issueId,
    // });
    // issue.body = issue.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    // console.log('issue', issue);

    // let newCommentBody = issue.body;
    // let newLabels = issue.labels.map((label) => label.name);

    // // Get last history entry of current platform
    // const lastHistoryEntryOfPCurrentlatform = [
    //   ...newCommentBody.matchAll(parseIssueHistoryRegex),
    // ]
    //   .map((match) => match.groups) // Extract groups
    //   .reduce((acc, item, i) => {
    //     // Reduce to last entry per platform
    //     const platforms = item.platforms.split(',').map((p) => p.trim()); // In case platforms are comma-separated
    //     platforms.forEach((platform) => {
    //       if (!acc[platform]) {
    //         acc[platform] = item;
    //         acc[platform]['index'] = i; // Add row index for later use
    //       }
    //     });
    //     return acc;
    //   }, {})[platform];

    // const testToggled =
    //   (lastHistoryEntryOfPCurrentlatform.passedTest === '❌' &&
    //     currentTest.passed_test === true) ||
    //   (lastHistoryEntryOfPCurrentlatform.passedTest === '✅' &&
    //     currentTest.passed_test === false);

    // // Update history via regex
    // let replaceIndex = 0;
    // newCommentBody = newCommentBody.replace(
    //   parseIssueHistoryRegex,
    //   (
    //     match,
    //     passedTest,
    //     platforms,
    //     date,
    //     oldVersion,
    //     errorCode,
    //     expectedErrorCode,
    //     i,
    //   ) => {
    //     /////////////////////////////////////////////
    //     // Add New Row
    //     let newFirstRow = '';
    //     // only add new entry if status changed, or if the test still failes on a newer version
    //     const addNewEntry =
    //       testToggled ||
    //       (!testToggled &&
    //         (lastHistoryEntryOfPCurrentlatform.version !== currentJaiVersion ||
    //           lastHistoryEntryOfPCurrentlatform.errorCode !== errorCode ||
    //           lastHistoryEntryOfPCurrentlatform.expectedErrorCode !==
    //             expectedErrorCode) &&
    //         currentTest.passed_test === false);
    //     if (replaceIndex === 0 && addNewEntry) {
    //       replaceIndex++; // Increment counter
    //       newFirstRow = `| ${
    //         currentTest.passed_test ? '✅' : '❌'
    //       } | ${platform} | ${currentDate} | ${currentJaiVersion} | ${
    //         currentTest.did_run
    //           ? currentTest.run_exit_code
    //           : currentTest.compilation_exit_code
    //       } - Expected ${currentTest.expected_error_code} |\n`;
    //     }

    //     /////////////////////////////////////////////
    //     // Overwrite Old Row
    //     replaceIndex++; // increment counter
    //     let oldRow = `| ${passedTest} | ${platforms} | ${date} | ${oldVersion} | ${errorCode} - Expected ${expectedErrorCode} |`;
    //     return `${newFirstRow}${oldRow}`;
    //   },
    // );

    // let newIssueState = undefined;
    // // Update header status
    // newCommentBody = newCommentBody.replace(
    //   parseIssueHeaderStatusRegex,
    //   (
    //     match,
    //     emailedIn,
    //     lastBrokenPlatforms,
    //     lastEncounteredVersion,
    //     fixVersion,
    //   ) => {
    //     let brokenPlatforms;
    //     let newEmailIn;
    //     if (testToggled && currentTest.passed_test) {
    //       // Test passed, remove platform from broken list
    //       brokenPlatforms = '-'; // lastBrokenPlatforms.split(', ').filter(p => p !== platform).join(', ') || '-'; // remove current platform from list
    //       fixVersion = currentJaiVersion;
    //       newEmailIn = '✅';
    //       newIssueState = 'closed';
    //       newLabels = newLabels.filter((p) => p !== platform);
    //     } else if (testToggled && !currentTest.passed_test) {
    //       // Test failed, add platform to broken list
    //       brokenPlatforms = platform; // [... new Set(lastBrokenPlatforms.split(', ').filter(p => p !== '-').concat(platform))].sort().join(', '); // add current platform to list
    //       lastEncounteredVersion = [lastEncounteredVersion, currentJaiVersion]
    //         .sort()
    //         .reverse()[0];
    //       fixVersion = '-'; // no fix version yet
    //       newEmailIn = '❌';
    //       newIssueState = 'open';
    //       newLabels.push(currentJaiVersion, platform);
    //     } else {
    //       // Test result did not change
    //       brokenPlatforms = lastBrokenPlatforms;
    //       newEmailIn = emailedIn;
    //     }
    //     return `| ${newEmailIn} | ${brokenPlatforms} | ${lastEncounteredVersion} | ${fixVersion} |`;
    //   },
    // );

    // const issueEntry = {};
    // issueEntry.issueId = issueId;
    // issueEntry.newLabels = [...new Set(newLabels)]; // remove duplicates
    // issueEntry.newCommentBody = newCommentBody;
    // issueEntry.newIssueState = newIssueState;
    // testSuitOutput.issues ||= [];
    // testSuitOutput.issues.push(issueEntry);

    // // newLabels = [...new Set(newLabels)]; // remove duplicates
    // // await createLabels({github, context, labelNames: newLabels});

    // // // Update comment
    // // await github.rest.issues.update({
    // //   ...context.repo,
    // //   issue_number: issueId,
    // //   body: newCommentBody,
    // //   ...(newIssueState ? { state: newIssueState, state_reason: newIssueState === 'open' ? 'reopened' : 'completed' } : {}),
    // //   labels: newLabels
    // // });
  // }

  // const { data } = await github.rest.repos.getContent({...context.repo, path: 'test_results.json'}).catch(() => ({ data: null }));

  // // Commit test_results.json
  // // @todo only do it once aswell
  // await github.rest.repos.createOrUpdateFileContents({
  //   ...context.repo,
  //   path: 'test_results.json',
  //   message: '[CI] Update test results',
  //   content: Buffer.from(newTestResultsFileContent || '').toString('base64'),
  //   branch: 'master',
  //   ...(data ? { sha: data.sha } : {})
  // });

  // Don't think we need to handle removed tests
  // for (const currentTest of removedTests) {
  // }

  // return testSuitOutput;
};

const updateGithubIssuesAndFiles = async ({
  github,
  context,
  exec,
  io,
  // testSuitOutputs,
}) => {
  const fs = require('fs');
  const { getCurrentJaiVersion, isDeepEqual, deepMerge } = require('./_utils.js');
  const { createLabels, createLabel } = require('./_create_label.js');

  createLabel({ github, context, labelName: 'removed-test' });

  const currentJaiVersion = await getCurrentJaiVersion({ exec });

  const supportedPlatforms = ['windows', 'linux'/*, 'macos'*/]; // :platformSpecific
  let activePlatforms = []; // all platforms where it found a test_results.json from
  
  let allTestResults = {};
  for (const platform of supportedPlatforms) {
    try {
      const data = fs.readFileSync(`${platform}/test_results.json`, 'utf8');
      const platformTestResults = JSON.parse(data);
      // console.log(`${platform}TestResults`, JSON.stringify(platformTestResults, null, 2));
      allTestResults = deepMerge(allTestResults, platformTestResults);
      activePlatforms.push(platform);
    } catch (err) {
      console.log(`No results found for platform '${platform}'`);
    }
  }
  console.log('activePlatforms', activePlatforms);
  console.log('allTestResults', JSON.stringify(allTestResults , null, 2));

  // // Load all results from each platform, and merge them  :platformSpecific
  // let windowsTestResults = {};
  // try {
  //   const data = fs.readFileSync('windows/test_results.json', 'utf8');
  //   windowsTestResults = JSON.parse(data);
  // } catch (err) {
  //   console.error('Error reading file:', err);
  // }
  // // console.log('windowsTestResults', JSON.stringify(windowsTestResults, null, 2));

  // let linuxTestResults = {};
  // try {
  //   const data = fs.readFileSync('linux/test_results.json', 'utf8');
  //   linuxTestResults = JSON.parse(data);
  // } catch (err) {
  //   console.error('Error reading file:', err);
  // }
  // // console.log('linuxTestResults', JSON.stringify(linuxTestResults, null, 2));



  //
  // Find all new, changed and removed tests
  //

  let oldTestResults = {};
  try {
    const data = fs.readFileSync('old_test_results.json', 'utf8');
    oldTestResults = JSON.parse(data);
  } catch (err) {
    console.error('Error reading file:', err);
  }

  const oldTestIssueNumbers = Object.keys(oldTestResults);
  const newTestIssueNumbers = Object.keys(allTestResults);

  // Find all tests that were added. We need this to gather extra results
  const newIssueNumbers = newTestIssueNumbers.filter(
    (item) => !oldTestIssueNumbers.includes(item),
  );
  // @copyPasta
  // Make sure that all new tests have a result for the current version on all active platforms
  for (const issueNumber of newIssueNumbers)
  {
    // It is garanteed that we at least have one result from the current machine on this version
    let newResultsForCurrentVersion = allTestResults[issueNumber][currentJaiVersion];
    if (!newResultsForCurrentVersion) {
      console.error('No results found for:', issueNumber, currentJaiVersion);
      throw new Error('No results found. This should never happen. Most likely something bad happened, or the runner this is running on was not part of the suit runners anymore! In the latter case, this runner could be out of date - or the only one with a newer version.');
    }

    // Enforce that all active platforms have a result for this version
    // No matter if this runner is on a newer or older one. At least one platform
    // would be missing in the result set, which would get detected here.
    for (const platform of activePlatforms) {
      if (!newResultsForCurrentVersion[platform]) {
        console.error('No results found for:', issueNumber, currentJaiVersion, platform);
        throw new Error('No results found. This should never happen. Most likely not all runners have been updated to the latest version!');
      }
    }
  }
  console.log('newIssueNumbers', JSON.stringify(newIssueNumbers, null, 2));

  // Find all tests that were removed
  const removedIssueNumbers = oldTestIssueNumbers.filter(
    (item) => !newTestIssueNumbers.includes(item),
  );
  console.log('removedIssueNumbers', JSON.stringify(removedIssueNumbers, null, 2));

  // All issues that existed both in old and new test results
  const commonIssueNumbers = oldTestIssueNumbers.filter(
    (item) => newTestIssueNumbers.includes(item),
  );
  console.log('commonIssueNumbers', JSON.stringify(commonIssueNumbers, null, 2));
  
  
  // Find all tests that had a new result in the new test results
  const changedIssueNumbers = commonIssueNumbers.filter(
    (issueNumber) => {
      // Only compare latest version
      let oldResultsForCurrentVersion = oldTestResults[issueNumber][currentJaiVersion];
      oldResultsForCurrentVersion ||= {}; // This could happen when a new compiler version was added

      // It is garanteed that we at least have one result from the current machine on this version
      let newResultsForCurrentVersion = allTestResults[issueNumber][currentJaiVersion];
      if (!newResultsForCurrentVersion) {
        console.error('No results found for:', issueNumber, currentJaiVersion);
        throw new Error('No results found. This should never happen. Most likely something bad happened, or the runner this is running on was not part of the suit runners anymore! In the latter case, this runner could be out of date - or the only one with a newer version.');
      }

      // Enforce that all active platforms have a result for this version
      // No matter if this runner is on a newer or older one. At least one platform
      // would be missing in the result set, which would get detected here.
      for (const platform of activePlatforms) {
        if (!newResultsForCurrentVersion[platform]) {
          console.error('No results found for:', issueNumber, currentJaiVersion, platform);
          throw new Error('No results found. This should never happen. Most likely not all runners have been updated to the latest version!');
        }
      }

      // Now we know, that newResultsForCurrentVersion has data for all active platforms.
      // 1) the oldResultsForCurrentVersion has a platform that is not active -> we ignore it
      // 2) theres a active platform that is not in oldResultsForCurrentVersion -> count as change
      //    -> this could happen, when we added a new platform. We have to count it as a change
      //       @todo maybe also trigger backtracking? But then this would have be detected
      //             in the runners, and not here. 
      //    -> Special case when a new compiler version was added, the old data will be empty!


      let relevantResultSetsAreEqual = true;
      for (const platform of activePlatforms) { // already handles case 1)
        // Handle case 2)
        const oldResultForPlatform = oldResultsForCurrentVersion[platform];
        if (!oldResultForPlatform) {
          console.log('change detected, because platform is missing in old results:', issueNumber, currentJaiVersion, platform);
          relevantResultSetsAreEqual = false;
          break;
        }

        // Compare the results
        const newResultForPlatform = newResultsForCurrentVersion[platform]; // garanteed to exist
        if (!isDeepEqual(oldResultForPlatform, newResultForPlatform)) {
          console.log('change detected, because results are different:', issueNumber, currentJaiVersion, platform);
          console.log('oldResultForPlatform', JSON.stringify(oldResultForPlatform, null, 2));
          console.log('newResultForPlatform', JSON.stringify(newResultForPlatform, null, 2));
          relevantResultSetsAreEqual = false;
          break;
        }
      }

      return !relevantResultSetsAreEqual; // Has changed!
    },
  );
  console.log('changedIssueNumbers', JSON.stringify(changedIssueNumbers, null, 2));


  


  // Update all new and changed tests. All unchanged tests are already up to date
  for (const issueNumber of [...newIssueNumbers, ...changedIssueNumbers]) {
    const testResultForCurrentVersion = allTestResults[issueNumber][currentJaiVersion];
    console.log('handle newOrChangedIssue', issueNumber);

    try {
      // Get Issue and Labels
      const { data: issue } = await github.rest.issues.get({
        ...context.repo,
        issue_number: issueNumber,
      });
      let newIssueBody = issue.body.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      const existingLabels = issue.labels.map(label => label.name);


      // const match = newIssueBody.matchAll(regex);
      // console.log([...match].map(m => m.groups));

      // If the current testResult has only one version, we can just update the latest
      // or append new one if version is not in history
      let replaceIndex = -1;
      newIssueBody = newIssueBody.replace(parseIssueHistoryRegex, (match, ...args) => {
        replaceIndex += 1;
        const row = args.pop();
        const columnNames = Object.keys(row);
        if (columnNames.length === 0) return match;
        // When adding new rows that are not platforms :historyColumns
        const filteredColumnNames = columnNames.filter(c => c !== 'version');
        if (filteredColumnNames.length === 0) return match;

        if (filteredColumnNames.length - 2 /* @todo remove -2*/ != activePlatforms.length ) {
          console.error('Column names do not match active platforms:', filteredColumnNames, activePlatforms);
          throw new Error('Column names do not match active platforms. Not yet supported');
        }

        let output = '';

        // Add new row since the current version should be the latest, and therefore the first!
        if (replaceIndex === 0 && row.version !== currentJaiVersion) {
          // Should be in order as the captured groups
          for (const column of columnNames) {
            const value = testResultForCurrentVersion[column];
            output += `| ${value} `;
          }
          output += '|';

          // If its the very first entry in the history, we dont need to readd the 
          // empty template line
          if (row.version !== '-') {
            output += '\n' + match
            return output;
          }
        }

        // Update the captured row 
        const resultForRowVersion = allTestResults[issueNumber][row.version]
        if (!resultForRowVersion) {
          if (row.version === currentJaiVersion) {
            if (replaceIndex === 0) {
              // :historyColumns
              console.error(`No TestResults found for '${column}' while updating issue '${issueNumber} for version '${row.version}'`);
              throw new Error('Error updating issue. This should only ever happen if the issue template was modified.');
            } else {
              throw new Error('Error only the first row should ever be the current version');
            }
          } else {
            // We dont have any data for this version, so we can not update it
            return match;
          }
          
        }
        output += `| ${row.version} |`; //  :historyColumns
        for (const column of filteredColumnNames) { // windows, linux, mac
          let value = row[column];
          // always update first row, otherwise fill in missing data
          if (value === '-' || replaceIndex === 0) { 
            // We dont know if we have data for the platform, just try
            const result = resultForRowVersion[column];
            if (!result) {
                continue;
            }

            console.log('Force overwriting:', column, row.version);

            const errorCode = result.did_run ? result.run_exit_code : result.compilation_exit_code;
            value = result.passed_test ? `✅ - ExitCode ${errorCode}` : `❌ - ExitCode ${errorCode} `;
          }
          output += ` ${value} |`;
        }

        return output;
      });

      console.log('newIssueBody', issueNumber, replaceIndex, JSON.stringify(newIssueBody, null, 2));  

      // @todo add labels of broken platforms
      // Update issue
      // await github.rest.issues.update({
      //   ...context.repo,
      //   issue_number: issueNumber,
      //   body: newIssueBody,
      //   // state: 'closed', // @todo
      //   // labels: updatedUniqueLabels,
      // });
      console.log('Updated Issue for newly added or changed test', issueNumber);
    } catch (error) {
      if (error.status === 404) {
        console.error(`Issue not found for '${issueNumber}'. The issue was most likely deleted. This should never happen.`);
      } else {
        console.error('An error occurred:', error.message);
      }
    }
  }



  // Handle all removed tests
  for (const issueNumber of removedIssueNumbers) {
    try {
      // Add label to issue
      const newLabel = 'removed-test';
      const { data: issue } = await github.rest.issues.get({
        ...context.repo,
        issue_number: issueNumber,
      });
      const existingLabels = issue.labels.map(label => label.name);
      const updatedUniqueLabels = [...new Set([...existingLabels, newLabel])];

      // Close issue.
      await github.rest.issues.update({
        ...context.repo,
        issue_number: issueNumber,
        state: 'closed',
        labels: updatedUniqueLabels,
      });
      console.log('Closed Issue for removed test', issueNumber);
    } catch (error) {
      if (error.status === 404) {
        console.log(`Issue not found for '${issueNumber}'. The issue was most likely deleted.`);
      } else {
        console.error('An error occurred:', error.message);
      }
    }
  }







  // const mergedPlatformIssues = {
  //   // issueId: {
  //   //   newLabels: [],
  //   //   historyEntries: [
  //   //     {
  //   //        passedTest: '✅',
  //   //        platforms: 'windows, linux',
  //   //        date: '2021-09-07',
  //   //        version: '0.1.093',
  //   //        errorCode: '0',
  //   //        expectedErrorCode: '0'
  //   //     }
  //   //   ]
  //   // }
  // };

  // // Gather all isssue data from all platforms
  // for (const platform in testSuitOutputs) {
  //   console.log('platform', platform);
  //   for (const issue of testSuitOutputs[platform]?.issues || []) {
  //     console.log('issue', issue);
  //     // All issues contain the updated history for each platform, we need to merge them
  //     // to do that, we combine them into one object and then reduce them to the last entry per platform.
  //     // While doing that, we also remove dublicates, and merge entries when possible
  //     mergedPlatformIssues[issue.issueId] ||= {
  //       newLabels: [],
  //       newIssueStates: [],
  //       historyEntries: [],
  //       newCommentBodies: [],
  //     };
  //     // Add all labels except those of other platforms, because they could be outdated
  //     mergedPlatformIssues[issue.issueId].newLabels.push(
  //       ...issue.newLabels.filter(
  //         (l) =>
  //           !Object.keys(testSuitOutputs)
  //             .filter((l) => l !== platform)
  //             .includes(l),
  //       ),
  //     );
  //     mergedPlatformIssues[issue.issueId].newCommentBodies.push(
  //       issue.newCommentBody,
  //     );
  //     mergedPlatformIssues[issue.issueId].newIssueStates.push(
  //       issue.newIssueState,
  //     );

  //     [...issue.newCommentBody.matchAll(parseIssueHistoryRegex)]
  //       .map((e) => e.groups)
  //       .forEach((g) => {
  //         const passedTest = g.passedTest;
  //         const platforms = g.platforms;
  //         const date = g.date;
  //         const version = g.version;
  //         const errorCode = g.errorCode;
  //         const expectedErrorCode = g.expectedErrorCode;

  //         mergedPlatformIssues[issue.issueId].historyEntries.push({
  //           passedTest,
  //           platforms,
  //           date,
  //           version,
  //           errorCode,
  //           expectedErrorCode,
  //         });
  //       });

  //     // const lastHistoryEntryOfPCurrentlatform = [...issue.newCommentBody.matchAll(parseIssueHistoryRegex)]
  //     //   .map(match => match.groups) // Extract groups
  //     //   .reduce((acc, item, i) => { // Reduce to last entry per platform
  //     //     const platforms = item.platforms.split(',').map(p => p.trim()); // In case platforms are comma-separated
  //     //     platforms.forEach(platform => {
  //     //       if (!acc[platform]) {
  //     //         acc[platform] = item;
  //     //         acc[platform]['index'] = i; // Add row index for later use
  //     //       }
  //     //     });
  //     //     return acc;
  //     //   }, {})[platform];

  //     // issue.newCommentBody = issue.newCommentBody.replace(parseIssueHeaderStatusRegex, (match, emailedIn, lastBrokenPlatforms, lastEncounteredVersion, fixVersion) => {
  //     //   lastBrokenPlatforms = platform;
  //     //   // Since its a new bug, we know the latest version is broken so we use it here
  //     //   lastEncounteredVersion = currentVersion;
  //     //   return `| ${emailedIn} | ${lastBrokenPlatforms} | ${lastEncounteredVersion} | ${fixVersion} |`;
  //     // })
  //   }
  // }

  // // Merge all information and update issues accordingly
  // for (const issueId in mergedPlatformIssues) {
  //   const issue = mergedPlatformIssues[issueId];
  //   console.log('issue', issueId, JSON.stringify(issue, null, 2));

  //   // Remove duplicates from history, and merge entries when all fields except platforms are the same
  //   const mergedHistoryEntries = issue.historyEntries.reduce((acc, item) => {
  //     const existingEntry = acc.reverse().find(
  //       (e) =>
  //         e.passedTest === item.passedTest &&
  //         // && e.date === item.date
  //         e.version === item.version &&
  //         e.errorCode === item.errorCode &&
  //         e.expectedErrorCode === item.expectedErrorCode,
  //     );

  //     console.log('existingEntry', existingEntry);

  //     if (existingEntry) {
  //       // If they are the same, skip, otherwise merge platforms
  //       if (existingEntry.platforms !== item.platforms) {
  //         // Merge platforms
  //         existingEntry.platforms = [
  //           ...new Set(
  //             existingEntry.platforms
  //               .split(', ')
  //               .concat(item.platforms.split(', ')),
  //           ),
  //         ]
  //           .filter((p) => p !== '-')
  //           .sort()
  //           .join(', ');
  //       }
  //     } else {
  //       acc.push(item);
  //     }
  //     return acc;
  //   }, []);

  //   // Sort latest date first and then by version
  //   mergedHistoryEntries.sort((a, b) => {
  //     if (a.date === b.date) {
  //       return b.version.localeCompare(a.version);
  //     }
  //     return b.date.localeCompare(a.date);
  //   });

  //   console.log(
  //     'mergedHistoryEntries',
  //     issueId,
  //     JSON.stringify(mergedHistoryEntries, null, 2),
  //   );

  //   let newCommentBody = issue.newCommentBodies[0];
  //   // Remove all history entries from the body
  //   newCommentBody = newCommentBody.replace(
  //     /(?<=History$\s(?:.*$\s){2,})\|.*\s?/gim,
  //     '',
  //   );
  //   // Add all updated history entries
  //   mergedHistoryEntries.forEach((entry) => {
  //     newCommentBody =
  //       newCommentBody.trimEnd() +
  //       `\n| ${entry.passedTest} | ${entry.platforms} | ${entry.date} | ${entry.version} | ${entry.errorCode} - Expected ${entry.expectedErrorCode} |`;
  //   });

  //   // Get last history entry of every platform
  //   const lastHistoryEntryByPlatform = [
  //     ...newCommentBody.matchAll(parseIssueHistoryRegex),
  //   ]
  //     .map((match) => match.groups) // Extract groups
  //     .reduce((acc, item, i) => {
  //       // Reduce to last entry per platform
  //       const platforms = item.platforms.split(',').map((p) => p.trim()); // In case platforms are comma-separated
  //       platforms.forEach((platform) => {
  //         if (!acc[platform]) {
  //           acc[platform] = item;
  //           acc[platform]['index'] = i; // Add row index for later use
  //         }
  //       });
  //       return acc;
  //     }, {});
  //   console.log('lastHistoryEntryByPlatform', lastHistoryEntryByPlatform);

  //   const statusHeaders = issue.newCommentBodies
  //     .reduce((acc, item) => {
  //       acc.push(item.match(parseIssueHeaderStatusRegex).groups);
  //       return acc;
  //     }, [])
  //     .reduce(
  //       (acc, item) => {
  //         // Make it SOA
  //         acc.emailedIn.push(item.emailedIn);
  //         acc.lastBrokenPlatforms.push(...item.lastBrokenPlatforms.split(', '));
  //         acc.lastEncounteredVersion.push(item.lastEncounteredVersion);
  //         acc.fixVersion.push(item.fixVersion);
  //         return acc;
  //       },
  //       {
  //         emailedIn: [],
  //         lastBrokenPlatforms: [],
  //         lastEncounteredVersion: [],
  //         fixVersion: [],
  //       },
  //     );
  //   console.log('statusHeaders', statusHeaders);

  //   let mergedHeaderState;
  //   if (issue.newIssueStates.some((v) => v === 'open')) {
  //     // newly failed on any platform
  //     mergedHeaderState = 'open';
  //   } else if (
  //     issue.newIssueStates.some((v) => v === 'closed') &&
  //     lastHistoryEntryByPlatform.map((i) => i.every((v) => v === '✅'))
  //   ) {
  //     // newly fixed on all platforms
  //     mergedHeaderState = 'closed';
  //   } else {
  //     mergedHeaderState = undefined; // even if some closed, its irrelevant if not all are closed
  //   }
  //   console.log('mergedHeaderState', mergedHeaderState);

  //   // Update header by merging the status of all platforms
  //   newCommentBody = newCommentBody.replace(
  //     parseIssueHeaderStatusRegex,
  //     (
  //       match,
  //       emailedIn,
  //       lastBrokenPlatforms,
  //       lastEncounteredVersion,
  //       fixVersion,
  //     ) => {
  //       const newLastBrokenPlatforms =
  //         [...new Set(statusHeaders.lastBrokenPlatforms)]
  //           .filter((p) => p !== '-')
  //           .sort()
  //           .join(', ') || '-';
  //       const newLastEncounteredVersion = statusHeaders.lastEncounteredVersion
  //         .sort()
  //         .reverse()[0]; // Take latest
  //       const newFixVersion = statusHeaders.fixVersion.some((v) => v === '-')
  //         ? '-'
  //         : statusHeaders.fixVersion
  //             .filter((v) => v !== '-')
  //             .sort()
  //             .reverse()[0];
  //       const newEmailedIn =
  //         mergedHeaderState === 'open'
  //           ? '❌'
  //           : mergedHeaderState === 'closed'
  //           ? '✅'
  //           : emailedIn;
  //       return `| ${newEmailedIn} | ${newLastBrokenPlatforms} | ${newLastEncounteredVersion} | ${newFixVersion} |`;
  //     },
  //   );

  //   // Create Labels
  //   const uniqueLabels = [...new Set(issue.newLabels)]; // remove duplicates
  //   await createLabels({ github, context, labelNames: uniqueLabels });

  //   // Update Body
  //   await github.rest.issues.update({
  //     ...context.repo,
  //     issue_number: issueId,
  //     body: newCommentBody,
  //     ...(mergedHeaderState
  //       ? {
  //           state: mergedHeaderState,
  //           state_reason:
  //             mergedHeaderState === 'open' ? 'reopened' : 'completed',
  //         }
  //       : {}),
  //     labels: uniqueLabels,
  //   });
  // }

  // // Update test_results.json
  // const { data: oldData } = await github.rest.repos
  //   .getContent({ ...context.repo, path: 'old_test_results.json' })
  //   .catch(() => ({ data: null }));

  // const windowsTestResultContent = fs.readFileSync(
  //   'windows/test_results.json',
  //   'utf8',
  // );
  // const windowsTestResults = JSON.parse(windowsTestResultContent);

  // const linuxTestResultContent = fs.readFileSync(
  //   'linux/test_results.json',
  //   'utf8',
  // );
  // const linuxTestResults = JSON.parse(linuxTestResultContent);

  // const newTestResults = {
  //   windows: windowsTestResults.windows,
  //   linux: linuxTestResults.linux,
  // };
  // const newTestResultsContent = JSON.stringify(newTestResults, null, 2);

  // if (oldData && atob(oldData.content) === newTestResultsContent) {
  //   console.log('No changes in test results, skipping update');
  //   return;
  // }

  // Commit new test_results.json
  // await github.rest.repos.createOrUpdateFileContents({
  //   ...context.repo,
  //   path: 'test_results.json',
  //   message: '[CI] Update test results',
  //   content: Buffer.from(JSON.stringify(newTestResults, null, 2)).toString('base64'),
  //   branch: 'master',
  //   ...(oldData ? { sha: oldData.sha } : {})
  // });
};

module.exports = {
  runTestSuitAndGatherOutput,
  updateGithubIssuesAndFiles,
};
