const decrementVersionString = (version, count = 1) => {
  const versionRegex = /(beta.)(\d+).(\d+).(\d+)/
  const versionSplit = version.match(versionRegex);

  let newMicro = parseInt(versionSplit[4]);
  let newMinor = parseInt(versionSplit[3]);
  let newMajor = parseInt(versionSplit[2]);
  for (let i = 0; i < count; i++) {
    // Decrement version
    let carry = 0;
    newMicro = newMicro - 1;
    if (newMicro < 0) {
      carry = 1
      newMicro = 0;
    }
    newMinor = newMinor - carry;
    if (newMinor < 0) {
      carry = 1
      newMinor = 0;
    }
    newMajor = newMajor - carry;
    if (newMajor < 0) {
      newMajor = 0;
    }
  }

  return `${versionSplit[1]}${newMajor}.${newMinor}.${newMicro.toString().padStart(3, '0')}`
}

const runTestSuitAndUpdate = async ({ github, context, exec, io }) => {
  const path = require('path');
  const fs = require('fs');

  // Jai Version
  const { isDeepEqual, jaiVersion: getJaiVersion } = require('./utils.js');
  const currentVersion = await getJaiVersion({ exec });
  let tempVersion = currentVersion

  // Get old state of test results
  let oldTestResults = [];
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    oldTestResults = JSON.parse(data);
  } catch (err) {
    console.error("Error reading file:", err);
  }

  console.log('Running for version:', tempVersion);
  const options = { silent: false };
  let compilerPath = await io.which('jai'); // we start with the current one
  const extension = path.extname(compilerPath);
  await exec.exec(`${compilerPath} bug_suit.jai`, [], options);

  tempVersion = decrementVersionString(tempVersion);
  console.log('Running for version:', tempVersion);
  compilerPath = path.resolve(compilerPath, '..', '..', '..', `jai-${tempVersion}/bin`) + `${path.sep}jai${extension}`;
  await exec.exec(`${compilerPath} bug_suit.jai`, [], options);

  tempVersion = decrementVersionString(tempVersion);
  console.log('Running for version:', tempVersion);
  compilerPath = path.resolve(compilerPath, '..', '..', '..', `jai-${tempVersion}/bin`) + `${path.sep}jai${extension}`;
  await exec.exec(`${compilerPath} bug_suit.jai`, [], options);


  // Get new test results
  let newTestResults = [];
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    newTestResults = JSON.parse(data);
  } catch (err) {
    console.error("Error reading file:", err);
  }

  // make test results available via version, and results via name
  const oldTestResultsByVersion = oldTestResults.reduce((acc, item) => {
    acc[item.version] = item;
    // also reduce the results
    acc[item.version].results = item.results.reduce((acc, item) => {
      acc[item.file] = item;
      return acc;
    }, {});

    return acc;
  }, {});

  const newTestResultsByVersion = newTestResults.reduce((acc, item) => {
    acc[item.version] = item;
    // also reduce the results
    acc[item.version].results = item.results.reduce((acc, item) => {
      acc[item.file] = item;
      return acc;
    }, {});

    return acc;
  }, {});

  // console.log('new test res', newTestResults);
  // console.log('newTestResultsByVersion', newTestResultsByVersion);

  const previousVersion = decrementVersionString(currentVersion, 1);
  console.log(previousVersion);
  // console.log('old', oldTestResultsByVersion[previousVersion]);
  // console.log('new', newTestResultsByVersion[previousVersion]);


  // We need to find all tests that are new. We compare the old and new log. We have to update their issues.
  //
  //
  //           Old Log       New Log
  //              -          0.1.094
  //           0.1.093  <>   0.1.093 // This version exists in both logs, compare them
  //           0.1.092       0.1.092
  //           0.1.091          -
  // 
  const newTests = Object.values(newTestResultsByVersion[previousVersion].results).filter(obj1 =>
    !oldTestResultsByVersion[previousVersion]  // if the previous version does not exist in old log, then all tests are new
    || !Object.values(oldTestResultsByVersion[previousVersion].results).some(obj2 => obj1.file === obj2.file) // if the file does not exist in old log
  );

  console.log('newTests\n', newTests);


  // We need to update all issues where the status has changed. We compare the old and new log.
  //
  //           Old Log       New Log
  //              -          0.1.094
  //                            ^--
  //                               |- compare those to versions, to see if the updated changed the test result
  //                            v--
  //           0.1.093       0.1.093 
  //           0.1.092       0.1.092
  //           0.1.091          -
  // 
  const changedTests = Object.values(newTestResultsByVersion[currentVersion].results).filter(
    obj1 => obj1.file in newTestResultsByVersion[previousVersion].results  // if the file exists in old log
      && !isDeepEqual(obj1, newTestResultsByVersion[previousVersion].results[obj1.file]) // if the test results are different
  )
  console.log('changedTests\n', changedTests);


  // We need to find all tests that are removed to close their issues.
  //
  //           Old Log       New Log
  //              -          0.1.094
  //           0.1.093  <>   0.1.093 // This version exists in both logs, compare them
  //           0.1.092       0.1.092
  //           0.1.091          -
  // 
  const removedTests = Object.values(oldTestResultsByVersion[previousVersion]?.results || []).filter(obj1 =>
    !newTestResultsByVersion[previousVersion]  // if the previous version does not exist in new log, then all tests are removed
    || !Object.values(newTestResultsByVersion[previousVersion].results).some(obj2 => obj1.file === obj2.file) // if the file does not exist in new log
  );
  console.log('removedTests\n', removedTests);


  // WARNING A TEST CAN BE IN newTests AND changedTests
  // probably handle new and removed first and then changed. So the
  // double update doesnt matter since changed parses the issue again anyways

  console.log(`Running on platform: ${process.env.RUNNER_OS}`);

  const platform = 'win'; //@todo get platform from env
  const oldToNewCompilerVersions = newTestResults.map(item => item.version).sort()

  for (const currentTest of newTests) {
    console.log('new test', currentTest);

    const issueId = Number.parseInt(currentTest.file.match(/\d+(?=[./])/)?.[0]) || -1;
    if (issueId === -1) {
      console.error('Issue ID not found in file name:', currentTest);
      continue;
    }

    const { data: issue } = await github.rest.issues.get({
      ...context.repo,
      issue_number: issueId
    });

    let newCommentBody = issue.body;

    const parseIssueHeaderStatusRegex = /(?<=\| :.*\n)\| (?<status>.*?) \| (?<emailedIn>.*?) \| (?<reportedVersion>.*?) \| (?<lastBrokenPlatforms>.*?) \| (?<lastEncounteredVersion>.*?) \| (?<fixVersion>.*?) \|/im;
    newCommentBody = newCommentBody.replace(parseIssueHeaderStatusRegex, (match, status, emailedIn, reportedVersion, lastBrokenPlatforms, lastEncounteredVersion, fixVersion) => {
      lastBrokenPlatforms = platform;
      // Since its a new bug, we know the latest version is broken so we use it here
      lastEncounteredVersion = currentVersion;
      return `| ${status} | ${emailedIn} | ${reportedVersion} | ${lastBrokenPlatforms} | ${lastEncounteredVersion} | ${fixVersion} |`;
    })


    const parseIssueHistoryRegex = /(?<=History$\s(?:.*$\s){2,})\| (?<passedTest>.*?) \| (?<platforms>.*?) \| (?<date>.*?) \| (?<version>.*?) \| (?<errorCode>\d+) - Expected (?<expectedErrorCode>\d+) \|/img;
    // since its a new issue, the history should be empty, all platforms in the matrix only get the original state and it will be udpated after all of them ran
    if (parseIssueHistoryRegex.test(newCommentBody))
      process.exit(1); // Should never happen


    // Go over all versions of the test run and change the history accordingly
    oldToNewCompilerVersions.forEach((version, index) => {
      console.log('version', version);
      console.log('currentTest', currentTest);
      const currentTestResultOfVersion = newTestResultsByVersion[version].results[currentTest.file];
      console.log(currentTestResultOfVersion);
      const currentDate = new Date().toISOString().split('T')[0];
      const currentPassedTest = currentTestResultOfVersion.passed_test ? '✅' : '❌';
      const currentErrorCode = currentTestResultOfVersion.did_run ? currentTestResultOfVersion.run_exit_code : currentTestResultOfVersion.compilation_exit_code;
      const currentExpectedErrorCode = currentTestResultOfVersion.expected_error_code;
      if (index === 0) {
        // Just append since the history is still empty
        newCommentBody = newCommentBody.trimEnd() + `\n| ${currentPassedTest} | ${platform} | ${currentDate} | ${version} | ${currentErrorCode} - Expected ${currentExpectedErrorCode} |`;
      } else {
        // Update history via regex, only works if at least one is there
          let replaceIndex = 0;
          newCommentBody = newCommentBody.replace(parseIssueHistoryRegex, (match, passedTest, platforms, date, oldVersion, errorCode, expectedErrorCode, i) => {
              /////////////////////////////////////////////
              // Add New Row
              let newFirstRow = '';
              const testResultOfPreviousVersion = newTestResultsByVersion[oldToNewCompilerVersions[index-1]].results[currentTest.file];
              const addNewEntry = currentTestResultOfVersion.passed_test === false || (currentTestResultOfVersion.passed_test === true && testResultOfPreviousVersion.passed_test === false);
              if (replaceIndex === 0 && addNewEntry) {
                replaceIndex++; // increment counter
                newFirstRow = `| ${currentPassedTest} | ${platform} | ${currentDate} | ${version} | ${currentErrorCode} - Expected ${currentExpectedErrorCode} |\n`
              }

              /////////////////////////////////////////////
              // Overwrite Old Row
              replaceIndex++; // increment counter
              let oldRow = `| ${passedTest} | ${platforms} | ${date} | ${oldVersion} | ${errorCode} - Expected ${expectedErrorCode} |`
              return `${newFirstRow}${oldRow}`;
            })

      }
    });

    // @todo instead up update here, pass result to updater
    // Update comment
    await github.rest.issues.update({
      ...context.repo,
      issue_number: issueId,
      body: newCommentBody
    });
  }

  // @todo instead up update here, pass result to updater
  return 'updated row';
};

module.exports = runTestSuitAndUpdate;