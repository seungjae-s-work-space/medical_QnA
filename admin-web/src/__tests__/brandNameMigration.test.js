const fs = require('fs');
const path = require('path');

const webRoot = path.join(__dirname, '..', '..');
const legacyBrandName = ['난임상담', '톡톡'].join('');
const currentBrandName = '난임정보톡톡';
const sourceExtensions = new Set(['.html', '.js', '.jsx']);

function collectSourceFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return collectSourceFiles(entryPath);
    }

    if (!sourceExtensions.has(path.extname(entry.name))) {
      return [];
    }

    return [entryPath];
  });
}

describe('web brand name migration', () => {
  test('web source uses the current public brand name', () => {
    const files = [
      ...collectSourceFiles(path.join(webRoot, 'src')),
      ...collectSourceFiles(path.join(webRoot, 'public')),
    ];

    const offenders = files
      .filter((file) => path.basename(file) !== path.basename(__filename))
      .filter((file) => fs.readFileSync(file, 'utf8').includes(legacyBrandName))
      .map((file) => path.relative(webRoot, file));

    expect(offenders).toEqual([]);
    expect(fs.readFileSync(path.join(webRoot, 'src', 'App.jsx'), 'utf8')).toMatch(
      new RegExp(`const SITE_NAME = '${currentBrandName}';`)
    );
    expect(fs.readFileSync(path.join(webRoot, 'public', 'index.html'), 'utf8')).toMatch(
      new RegExp(`<meta name="application-name" content="${currentBrandName}" />`)
    );
  });
});
