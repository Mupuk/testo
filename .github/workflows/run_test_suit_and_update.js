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
  const oriCurrentVersion = await getJaiVersion({ exec });
  let currentVersion = oriCurrentVersion

  // Get old state of test results
  let oldTestResults = [];
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    oldTestResults = JSON.parse(data);
  } catch (err) {
    console.error("Error reading file:", err);
  }

  console.log('Running for version:', currentVersion);
  const options = { silent: false };
  let compilerPath = await io.which('jai'); // we start with the current one
  const extension = path.extname(compilerPath);
  await exec.exec(`${compilerPath} bug_suit.jai`, [], options);


  currentVersion = decrementVersionString(currentVersion);
  console.log('Running for version:', currentVersion);
  compilerPath = path.resolve(compilerPath, '..', '..', '..', `jai-${currentVersion}/bin`) + `${path.sep}jai${extension}`;
  await exec.exec(`${compilerPath} bug_suit.jai`, [], options);

  currentVersion = decrementVersionString(currentVersion);
  console.log('Running for version:', currentVersion);
  compilerPath = path.resolve(compilerPath, '..', '..', '..', `jai-${currentVersion}/bin`) + `${path.sep}jai${extension}`;
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
  const oldVersionsObject = oldTestResults.reduce((acc, item) => {
    acc[item.version] = item;
    // also reduce the results
    acc[item.version].results = item.results.reduce((acc, item) => {
      acc[item.file] = item;
      return acc;
    }, {});

    return acc;
  }, {});

  const newVersionsObject = newTestResults.reduce((acc, item) => {
    acc[item.version] = item;
    // also reduce the results
    acc[item.version].results = item.results.reduce((acc, item) => {
      acc[item.file] = item;
      return acc;
    }, {});

    return acc;
  }, {});

  console.log('new test res', newTestResults);
  console.log('newVersionsObject', newVersionsObject);

  const ver = decrementVersionString(oriCurrentVersion, 1);
  console.log(ver);
  console.log('old', oldVersionsObject[ver]);
  console.log('new', newVersionsObject[ver]);

  // dif with old state to get new tests. We take one older version, because the comparison version
  // has to exist. A new one doesnt exist in old log. Also we dont take the oldest, because
  // it could have been replaced by the latest one. Only leaves the middle as option.
  const newTestNames = Object.values(newVersionsObject[ver].results).filter(obj1 =>
    !oldVersionsObject[ver] || !Object.values(oldVersionsObject[ver].results).some(obj2 => obj1.file === obj2.file)
  );
  const newTest = newTestNames.length > 0


  // if new test we have to check all version for first encounter. Otherwise just current and
  // one before
  const changedTestNames = Object.values(newVersionsObject[currentVersion].results).filter(obj1 =>
    obj1.file in newVersionsObject[ver].results && !isDeepEqual(obj1, newVersionsObject[ver].results[obj1.file])
  )

  // console.log('new test', newTest);
  // console.log('new test names ', newTestNames);
  // console.log('changed test names ', changedTestNames);

  changedTestNames.forEach(newele => {
    const oldele = newVersionsObject[ver].results[newele.file];
    // update issue
    console.log('old', oldele);
    console.log('new', newele);
  });
};

module.exports = runTestSuitAndUpdate;