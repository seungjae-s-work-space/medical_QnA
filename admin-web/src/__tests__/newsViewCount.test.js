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

  test('web uses server-side tracking while existing mobile increments stay authorized', () => {
    const news = read('components/NewsManager.jsx');
    const encyclopedia = read('components/EncyclopediaManager.jsx');
    const rules = fs.readFileSync(
      path.join(srcDir, '..', '..', 'medical_qa_app', 'firestore.rules'),
      'utf8'
    );

    expect(news).toContain("recordWebArticleView('news', article.id)");
    expect(encyclopedia).toContain('recordWebArticleView(collectionName, article.id)');
    expect(news).not.toContain('!readOnly || !auth.currentUser');
    expect(encyclopedia).not.toContain('!readOnly || !auth.currentUser');

    expect(rules).toMatch(/match \/news\/\{newsId\}/);
    expect(rules).toMatch(/request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['viewCount'\]\)/);
    expect(rules).toMatch(/request\.resource\.data\.viewCount == resource\.data\.viewCount \+ 1/);
  });
});
