enum ArticleSection {
  encyclopedia('encyclopedia', '난임백과'),
  maleInfertility('male_infertility', '남성난임');

  const ArticleSection(this.collectionName, this.title);

  final String collectionName;
  final String title;

  String get imageFolder => '${collectionName}_images';
}
