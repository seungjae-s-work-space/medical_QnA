const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(srcDir, relativePath), 'utf8');
}

describe('news view count display', () => {
  test('news matches encyclopedia view count storage and display pattern', () => {
    const news = read('components/NewsManager.jsx');

    expect(news).toMatch(/RemoveRedEyeRoundedIcon/);
    expect(news).toMatch(/viewCount:\s*0/);
    expect(news).toMatch(/article\.viewCount \|\| 0/);
    expect(news).toMatch(/조회 \{viewArticle\.viewCount \|\| 0\}/);
  });

  test('news and encyclopedia increment view counts when members open public content', () => {
    const news = read('components/NewsManager.jsx');
    const encyclopedia = read('components/EncyclopediaManager.jsx');
    const rules = fs.readFileSync(
      path.join(srcDir, '..', '..', 'medical_qa_app', 'firestore.rules'),
      'utf8'
    );

    expect(news).toMatch(/increment/);
    expect(news).toMatch(/viewCount: increment\(1\)/);
    expect(news).toMatch(/doc\(db, 'news', article\.id\)/);
    expect(news).toMatch(/!readOnly \|\| !auth\.currentUser/);

    expect(encyclopedia).toMatch(/increment/);
    expect(encyclopedia).toMatch(/viewCount: increment\(1\)/);
    expect(encyclopedia).toMatch(/doc\(db, 'encyclopedia', article\.id\)/);
    expect(encyclopedia).toMatch(/!readOnly \|\| !auth\.currentUser/);

    expect(rules).toMatch(/match \/news\/\{newsId\}/);
    expect(rules).toMatch(/request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['viewCount'\]\)/);
    expect(rules).toMatch(/request\.resource\.data\.viewCount == resource\.data\.viewCount \+ 1/);
  });
});
