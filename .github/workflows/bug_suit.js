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

const bugSuit = async ({ github, context, exec, io }) => {
  const path = require('path');
  const fs = require('fs');

  // Jai Version
  const { isDeepEqual, jaiVersion: get_jai_version } = require('./utils.js');
  let currentVersion = await get_jai_version({ exec });

  // Get old state of test results
  let old_test_results = [];
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    old_test_results = JSON.parse(data);
  } catch (err) {
    console.error("Error reading file:", err);
  }

  console.log('Running for version:', currentVersion);
  const options = { silent: true };
  let compiler_path = await io.which('jai'); // we start with the current one
  const extension = path.extname(compiler_path);
  await exec.exec(`${compiler_path} bug_suit.jai`, [], options);


  currentVersion = decrementVersionString(currentVersion);
  console.log('Running for version:', currentVersion);
  compiler_path = path.resolve(compiler_path, '..', '..', '..', `jai-${currentVersion}/bin`) + `${path.sep}jai${extension}`;
  await exec.exec(`${compiler_path} bug_suit.jai`, [], options);

  currentVersion = decrementVersionString(currentVersion);
  console.log('Running for version:', currentVersion);
  compiler_path = path.resolve(compiler_path, '..', '..', '..', `jai-${currentVersion}/bin`) + `${path.sep}jai${extension}`;
  await exec.exec(`${compiler_path} bug_suit.jai`, [], options);


  // Get new test results
  let new_test_results = {};
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    new_test_results = JSON.parse(data);
  } catch (err) {
    console.error("Error reading file:", err);
  }

  // make test results available via version, and results via name
  const oldVersionsObject = old_test_results.reduce((acc, item) => {
    acc[item.version] = item;
    // also reduce the results
    acc[item.version].results = item.results.reduce((acc, item) => {
      acc[item.file] = item;
      return acc;
    }, {});

    return acc;
  }, {});

  const newVersionsObject = new_test_results.reduce((acc, item) => {
    acc[item.version] = item;
    // also reduce the results
    acc[item.version].results = item.results.reduce((acc, item) => {
      acc[item.file] = item;
      return acc;
    }, {});

    return acc;
  }, {});

  const oriver = currentVersion;
  const ver = decrementVersionString(oriver, 1);
  console.log(JSON.stringify(oldVersionsObject[ver], null, 2));
  console.log(JSON.stringify(newVersionsObject[ver], null, 2));

  // dif with old state to get new tests. We take one older version, because the comparison version
  // has to exist. A new one doesnt exist in old log. Also we dont take the oldest, because
  // it could have been replaced by the latest one. Only leaves the middle as option.
  const new_test_names = Object.values(newVersionsObject[ver].results).filter(obj1 =>
    !Object.values(oldVersionsObject[ver].results).some(obj2 => obj1.file === obj2.file)
  );
  const new_test = new_test_names.length > 0


  // if new test we have to check all version for first encounter. Otherwise just current and
  // one before
  const changed_test_names = Object.values(newVersionsObject[oriver].results).filter(obj1 =>
    obj1.file in newVersionsObject[ver].results && !isDeepEqual(obj1, newVersionsObject[ver].results[obj1.file])
  )

  console.log('new test', new_test);
  console.log('new test names ', new_test_names);
  console.log('changed test names ', changed_test_names);

  changed_test_names.forEach(newele => {
    const oldele = newVersionsObject[ver].results[newele.file];
    // update issue
  });
};

module.exports = bugSuit;