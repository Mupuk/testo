const createIssue = async ({github, context, exec}) => {
  await exec.exec('jai bug_suit.jai');
  
  let content = {};

  const fs = require('fs');
  try {
    const data = fs.readFileSync('test_results.json', 'utf8');
    console.log("File content:");
    content = JSON.parse(data);
  } catch (err) {
      console.error("Error reading file:", err);
  }
  
  console.log(content);
};

module.exports = createIssue;