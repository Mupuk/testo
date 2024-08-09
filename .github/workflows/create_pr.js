function parseIssueBody(text) {
  const sections = text.split('### ').slice(1); // Split into sections by headings
  const parsedData = [];

  sections.forEach(section => {
    const lines = section.trim().split('\n');
    const heading = lines.shift().trim(); // First line is the heading
    const content = lines.join('\n').trim(); // Remaining lines are the content

    if (heading === 'General') {
      // Parse checkboxes
      const checkboxes = lines
        .filter(line => line.trim().length > 0)
        .map(line => {
          const isChecked = line.toLowerCase().includes('[x]');
          return {
            label: line.replace(/- \[.\]\s*/, '').trim(),
            checked: isChecked
          };
        });
      parsedData.push(checkboxes);
    } else if (heading === 'Short Code Snippet') {
      // Extract text inside ```c``` block
      const codeBlockMatch = content.match(/```c([\s\S]*?)```/);
      parsedData.push(codeBlockMatch ? codeBlockMatch[1].trim() : '');
    } else {
      // Parse other sections
      parsedData.push(content);
    }
  });

  return parsedData;
}


const createPr = async ({github, context}) => {
  // Get issue
  const { data: issue } = await github.rest.issues.get({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number
  });
  // console.log(issue);

  // Get title text
  const regex = /(?:\[SB\]): (.{5,})/gmi;
  const match = [...issue.title.matchAll(regex)][0] || [];
  const title_text = match[1]; // maybe undefined
  if (title_text === undefined) return;

  console.log(title_text);
  const parsed = parseIssueBody(issue.body);
  console.log(parsed);
}

module.exports = createPr;