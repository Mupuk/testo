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
  const newTestNames = Object.values(newTestResultsByVersion[previousVersion].results).filter(obj1 =>
    !oldTestResultsByVersion[previousVersion]  // if the previous version does not exist in old log, then all tests are new
    || !Object.values(oldTestResultsByVersion[previousVersion].results).some(obj2 => obj1.file === obj2.file) // if the file does not exist in old log
  );
  const hasNewTests = newTestNames.length > 0

  console.log('newTestNames\n', newTestNames);


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
  const changedTestNames = Object.values(newTestResultsByVersion[currentVersion].results).filter(
    obj1 => obj1.file in newTestResultsByVersion[previousVersion].results  // if the file exists in old log
      && !isDeepEqual(obj1, newTestResultsByVersion[previousVersion].results[obj1.file]) // if the test results are different
  )
  console.log('changedTestNames\n', changedTestNames);


  // We need to find all tests that are removed to close their issues.
  //
  //           Old Log       New Log
  //              -          0.1.094
  //           0.1.093  <>   0.1.093 // This version exists in both logs, compare them
  //           0.1.092       0.1.092
  //           0.1.091          -
  // 
  const removedTestNames = Object.values(oldTestResultsByVersion[previousVersion].results).filter(obj1 =>
    !newTestResultsByVersion[previousVersion]  // if the previous version does not exist in new log, then all tests are removed
    || !Object.values(newTestResultsByVersion[previousVersion].results).some(obj2 => obj1.file === obj2.file) // if the file does not exist in new log
  );
  console.log('removedTestNames\n', removedTestNames);
};

module.exports = runTestSuitAndUpdate;